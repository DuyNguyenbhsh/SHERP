import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EnergyInspectionService } from './energy-inspection.service';
import { EnergyInspectionStatus } from './enums/energy.enum';

type MgrStub = {
  findOne: jest.Mock;
  count: jest.Mock;
  save: jest.Mock;
  create: jest.Mock;
  createQueryBuilder: jest.Mock;
};

describe('EnergyInspectionService.recordReading', () => {
  let mgr: MgrStub;
  let qb: {
    where: jest.Mock;
    orderBy: jest.Mock;
    limit: jest.Mock;
    getOne: jest.Mock;
  };
  let dataSource: { transaction: jest.Mock };
  let workItems: { syncProgress: jest.Mock };
  let service: EnergyInspectionService;

  beforeEach(() => {
    qb = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };
    mgr = {
      findOne: jest.fn(),
      count: jest.fn(),
      save: jest.fn(async (obj: unknown) => obj),
      create: jest.fn((_e: unknown, obj: unknown) => obj),
      createQueryBuilder: jest.fn(() => qb),
    };
    dataSource = {
      transaction: jest.fn(async (cb: (m: MgrStub) => Promise<unknown>) =>
        cb(mgr),
      ),
    };
    workItems = { syncProgress: jest.fn() };

    service = new EnergyInspectionService(
      {} as never,
      {} as never,
      {} as never,
      dataSource as never,
      workItems as never,
    );
  });

  const inspectionBase = (overrides: Record<string, unknown> = {}) => ({
    id: 'insp-1',
    work_item_id: 'wi-1',
    status: EnergyInspectionStatus.NEW,
    required_meter_ids: ['m-1', 'm-2'],
    completed_at: null,
    ...overrides,
  });

  it('block khi inspection đã COMPLETED', async () => {
    mgr.findOne.mockResolvedValueOnce(
      inspectionBase({ status: EnergyInspectionStatus.COMPLETED }),
    );

    await expect(
      service.recordReading(
        'insp-1',
        { meter_id: 'm-1', value: '100' } as never,
        'user-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('block khi meter không nằm trong required_meter_ids', async () => {
    mgr.findOne.mockResolvedValueOnce(inspectionBase());

    await expect(
      service.recordReading(
        'insp-1',
        { meter_id: 'm-outside', value: '50' } as never,
        'user-1',
      ),
    ).rejects.toThrow(/không nằm trong scope/);
  });

  it('404 khi inspection không tồn tại', async () => {
    mgr.findOne.mockResolvedValueOnce(null);

    await expect(
      service.recordReading(
        'insp-missing',
        { meter_id: 'm-1', value: '100' } as never,
        'user-1',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('BR-EI-01: meter cumulative + value giảm → BadRequestException', async () => {
    const inspection = inspectionBase();
    mgr.findOne
      .mockResolvedValueOnce(inspection)
      .mockResolvedValueOnce({ id: 'm-1', is_cumulative: true }) // meter
      .mockResolvedValueOnce(null); // existing reading row
    qb.getOne.mockResolvedValue({ value: '150' });

    await expect(
      service.recordReading(
        'insp-1',
        { meter_id: 'm-1', value: '100' } as never,
        'user-1',
      ),
    ).rejects.toThrow(/Đồng hồ tổng không được giảm/);
  });

  it('Happy path 1/2: NEW → IN_PROGRESS, syncProgress 50%, not completed', async () => {
    const inspection = inspectionBase();
    mgr.findOne
      .mockResolvedValueOnce(inspection)
      .mockResolvedValueOnce({ id: 'm-1', is_cumulative: true })
      .mockResolvedValueOnce(null);
    qb.getOne.mockResolvedValue(null); // no previous reading
    mgr.count.mockResolvedValue(1);

    await service.recordReading(
      'insp-1',
      { meter_id: 'm-1', value: '100' } as never,
      'user-1',
    );

    expect(inspection.status).toBe(EnergyInspectionStatus.IN_PROGRESS);
    expect(inspection.completed_at).toBeNull();
    expect(workItems.syncProgress).toHaveBeenCalledWith('wi-1', 50, false);
  });

  it('BR-EI-03: 2/2 meters → COMPLETED + completed_at + syncProgress 100, true', async () => {
    const inspection = inspectionBase({
      status: EnergyInspectionStatus.IN_PROGRESS,
    });
    mgr.findOne
      .mockResolvedValueOnce(inspection)
      .mockResolvedValueOnce({ id: 'm-2', is_cumulative: true })
      .mockResolvedValueOnce(null);
    qb.getOne.mockResolvedValue(null);
    mgr.count.mockResolvedValue(2);

    await service.recordReading(
      'insp-1',
      { meter_id: 'm-2', value: '200' } as never,
      'user-1',
    );

    expect(inspection.status).toBe(EnergyInspectionStatus.COMPLETED);
    expect(inspection.completed_at).toBeInstanceOf(Date);
    expect(workItems.syncProgress).toHaveBeenCalledWith('wi-1', 100, true);
  });

  it('Upsert: existing reading overwrite value + giữ photo cũ khi DTO không truyền', async () => {
    const inspection = inspectionBase();
    const existing = {
      id: 'r-1',
      value: '50',
      photo_url: 'old.jpg',
      notes: 'before',
    };
    mgr.findOne
      .mockResolvedValueOnce(inspection)
      .mockResolvedValueOnce({ id: 'm-1', is_cumulative: true })
      .mockResolvedValueOnce(existing);
    qb.getOne.mockResolvedValue({ value: '40' });
    mgr.count.mockResolvedValue(1);

    await service.recordReading(
      'insp-1',
      { meter_id: 'm-1', value: '60' } as never,
      'user-1',
    );

    expect(existing.value).toBe('60');
    expect(existing.photo_url).toBe('old.jpg');
  });
});
