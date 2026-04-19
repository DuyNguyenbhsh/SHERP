import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ChecklistsService } from './checklists.service';
import { ChecklistInstanceStatus } from './enums/checklist.enum';

type MgrStub = {
  findOne: jest.Mock;
  count: jest.Mock;
  save: jest.Mock;
  create: jest.Mock;
};

describe('ChecklistsService.submitItemResult', () => {
  let mgr: MgrStub;
  let dataSource: { transaction: jest.Mock };
  let workItems: { syncProgress: jest.Mock };
  let service: ChecklistsService;

  const template = {
    id: 'tpl-1',
    items: [
      { id: 'item-1', result_type: 'PASS_FAIL', require_photo: false },
      { id: 'item-2', result_type: 'PASS_FAIL', require_photo: false },
    ],
  };

  beforeEach(() => {
    mgr = {
      findOne: jest.fn(),
      count: jest.fn(),
      save: jest.fn(async (obj: unknown) => obj),
      create: jest.fn((_entity: unknown, obj: unknown) => obj),
    };
    dataSource = {
      transaction: jest.fn(async (cb: (m: MgrStub) => Promise<unknown>) =>
        cb(mgr),
      ),
    };
    workItems = { syncProgress: jest.fn() };

    service = new ChecklistsService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      dataSource as never,
      workItems as never,
    );
  });

  it('BR-CHK-05: block khi instance đã COMPLETED', async () => {
    mgr.findOne.mockResolvedValueOnce({
      id: 'ci-1',
      status: ChecklistInstanceStatus.COMPLETED,
      template,
    });

    await expect(
      service.submitItemResult('ci-1', 'item-1', {
        result: 'PASS',
      } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('Item không thuộc template → NotFoundException', async () => {
    mgr.findOne.mockResolvedValueOnce({
      id: 'ci-1',
      status: ChecklistInstanceStatus.NEW,
      template,
    });

    await expect(
      service.submitItemResult('ci-1', 'item-unknown', {
        result: 'PASS',
      } as never),
    ).rejects.toThrow(NotFoundException);
  });

  it('Submit item đầu tiên (1/2): instance NEW → IN_PROGRESS, sync WorkItem progressPct=50', async () => {
    const instance = {
      id: 'ci-1',
      work_item_id: 'wi-1',
      status: ChecklistInstanceStatus.NEW,
      template,
      completed_at: null,
    };
    mgr.findOne
      .mockResolvedValueOnce(instance) // 1st call: load instance
      .mockResolvedValueOnce(null); // 2nd call: existing result = none
    mgr.count.mockResolvedValue(1);

    await service.submitItemResult('ci-1', 'item-1', {
      result: 'PASS',
    } as never);

    expect(instance.status).toBe(ChecklistInstanceStatus.IN_PROGRESS);
    expect(instance.completed_at).toBeNull();
    expect(workItems.syncProgress).toHaveBeenCalledWith('wi-1', 50, false);
  });

  it('Submit item cuối (2/2): auto COMPLETED + completed_at set + sync WorkItem 100', async () => {
    const instance = {
      id: 'ci-1',
      work_item_id: 'wi-1',
      status: ChecklistInstanceStatus.IN_PROGRESS,
      template,
      completed_at: null,
    };
    mgr.findOne.mockResolvedValueOnce(instance).mockResolvedValueOnce(null);
    mgr.count.mockResolvedValue(2);

    await service.submitItemResult('ci-1', 'item-2', {
      result: 'PASS',
    } as never);

    expect(instance.status).toBe(ChecklistInstanceStatus.COMPLETED);
    expect(instance.completed_at).toBeInstanceOf(Date);
    expect(workItems.syncProgress).toHaveBeenCalledWith('wi-1', 100, true);
  });

  it('Không sync WorkItem khi instance không có work_item_id', async () => {
    const instance = {
      id: 'ci-1',
      work_item_id: null,
      status: ChecklistInstanceStatus.NEW,
      template,
      completed_at: null,
    };
    mgr.findOne.mockResolvedValueOnce(instance).mockResolvedValueOnce(null);
    mgr.count.mockResolvedValue(1);

    await service.submitItemResult('ci-1', 'item-1', {
      result: 'PASS',
    } as never);

    expect(workItems.syncProgress).not.toHaveBeenCalled();
  });

  it('Upsert existing result: preserve photos khi DTO không truyền', async () => {
    const instance = {
      id: 'ci-1',
      work_item_id: null,
      status: ChecklistInstanceStatus.IN_PROGRESS,
      template,
      completed_at: null,
    };
    const existing = {
      id: 'r-1',
      instance_id: 'ci-1',
      item_template_id: 'item-1',
      result: 'FAIL',
      photos: ['url-old'],
      notes: 'original',
    };
    mgr.findOne.mockResolvedValueOnce(instance).mockResolvedValueOnce(existing);
    mgr.count.mockResolvedValue(1);

    await service.submitItemResult('ci-1', 'item-1', {
      result: 'PASS',
    } as never);

    // result updated, photos giữ nguyên do DTO không truyền
    expect(existing.result).toBe('PASS');
    expect(existing.photos).toEqual(['url-old']);
  });
});
