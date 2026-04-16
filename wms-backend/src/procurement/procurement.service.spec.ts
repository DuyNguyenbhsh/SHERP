import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { ProcurementService } from './procurement.service';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { ProjectsService } from '../projects/projects.service';
import { PoStatus } from './enums/procurement.enum';

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  save: jest.fn((x) => ({ id: 'po-uuid', ...x })),
  create: jest.fn((x) => x),
  count: jest.fn().mockResolvedValue(0),
});

const createManagerMock = () => ({
  findOne: jest.fn(),
  save: jest.fn((entityOrTarget: unknown, payload?: unknown) => {
    // save(entity) — single-arg form (passed entity instance)
    if (payload === undefined) {
      return Promise.resolve({ id: 'mgr-id', ...(entityOrTarget as object) });
    }
    // save(Entity, array) — batch form
    if (Array.isArray(payload)) return Promise.resolve(payload);
    // save(Entity, obj)
    return Promise.resolve({ id: 'mgr-id', ...(payload as object) });
  }),
  create: jest.fn((_entity, x) => x),
});

const mockProjectsService = {
  checkBudgetLimit: jest.fn().mockResolvedValue({ ok: true }),
};

describe('ProcurementService', () => {
  let service: ProcurementService;
  let poRepo: ReturnType<typeof mockRepo>;
  let manager: ReturnType<typeof createManagerMock>;

  beforeEach(async () => {
    jest.clearAllMocks();
    manager = createManagerMock();
    const mockDataSource = {
      transaction: jest.fn((cb: (m: unknown) => unknown) => cb(manager)),
    };
    const poRepoMock = mockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcurementService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: getRepositoryToken(PurchaseOrder), useValue: poRepoMock },
        { provide: ProjectsService, useValue: mockProjectsService },
      ],
    }).compile();

    service = module.get<ProcurementService>(ProcurementService);
    poRepo = poRepoMock;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── createPO() ──
  describe('createPO()', () => {
    it('tính total_amount = sum(order_qty * unit_price)', async () => {
      const dto = {
        vendor_id: 'v1',
        lines: [
          { product_id: 'p1', order_qty: 10, unit_price: 1000 },
          { product_id: 'p2', order_qty: 5, unit_price: 2000 },
        ],
      } as any;

      const result = await service.createPO(dto);
      const po = result.data as any;
      expect(po.total_amount).toBe(10 * 1000 + 5 * 2000);
      expect(po.status).toBe(PoStatus.APPROVED);
      expect(po.po_number).toMatch(/^PO-\d+$/);
    });

    it('gọi checkBudgetLimit khi có project_id + category_id', async () => {
      const dto = {
        vendor_id: 'v1',
        project_id: 'prj-1',
        category_id: 'cat-1',
        lines: [{ product_id: 'p1', order_qty: 2, unit_price: 500 }],
      } as any;

      await service.createPO(dto);
      expect(mockProjectsService.checkBudgetLimit).toHaveBeenCalledWith(
        'prj-1',
        'cat-1',
        1000,
        expect.objectContaining({
          transaction_ref: expect.stringMatching(/^PO-/),
        }),
      );
    });

    it('KHÔNG gọi checkBudgetLimit khi thiếu project/category', async () => {
      await service.createPO({
        vendor_id: 'v1',
        lines: [{ product_id: 'p1', order_qty: 1, unit_price: 100 }],
      } as any);
      expect(mockProjectsService.checkBudgetLimit).not.toHaveBeenCalled();
    });
  });

  // ── receiveGoods() ──
  describe('receiveGoods()', () => {
    it('throws NotFoundException khi PO không tồn tại', async () => {
      manager.findOne.mockResolvedValue(null);
      await expect(
        service.receiveGoods({
          po_id: 'missing',
          received_by: 'u1',
          lines: [],
        } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('chặn khi PO đã COMPLETED', async () => {
      manager.findOne.mockResolvedValue({
        id: 'po-1',
        status: PoStatus.COMPLETED,
        lines: [],
      });
      await expect(
        service.receiveGoods({
          po_id: 'po-1',
          received_by: 'u1',
          lines: [],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('chặn khi PO đã CANCELED', async () => {
      manager.findOne.mockResolvedValue({
        id: 'po-1',
        status: PoStatus.CANCELED,
        lines: [],
      });
      await expect(
        service.receiveGoods({
          po_id: 'po-1',
          received_by: 'u1',
          lines: [],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('đặt status COMPLETED khi tất cả lines nhận đủ qty', async () => {
      const poLine = {
        id: 'pol-1',
        product_id: 'p1',
        order_qty: 10,
        received_qty: 0,
      };
      const po = {
        id: 'po-1',
        status: PoStatus.APPROVED,
        lines: [poLine],
      };
      manager.findOne.mockResolvedValue(po);

      await service.receiveGoods({
        po_id: 'po-1',
        received_by: 'u1',
        lines: [{ po_line_id: 'pol-1', received_qty: 10, serial_numbers: [] }],
      } as any);

      expect(poLine.received_qty).toBe(10);
      expect(po.status).toBe(PoStatus.COMPLETED);
    });

    it('đặt status RECEIVING khi có line chưa nhận đủ', async () => {
      const poLine = {
        id: 'pol-1',
        product_id: 'p1',
        order_qty: 10,
        received_qty: 0,
      };
      const po = {
        id: 'po-1',
        status: PoStatus.APPROVED,
        lines: [poLine],
      };
      manager.findOne.mockResolvedValue(po);

      await service.receiveGoods({
        po_id: 'po-1',
        received_by: 'u1',
        lines: [{ po_line_id: 'pol-1', received_qty: 3, serial_numbers: [] }],
      } as any);

      expect(poLine.received_qty).toBe(3);
      expect(po.status).toBe(PoStatus.RECEIVING);
    });

    it('bỏ qua po_line_id không khớp thay vì crash', async () => {
      const po = {
        id: 'po-1',
        status: PoStatus.APPROVED,
        lines: [
          { id: 'pol-1', product_id: 'p1', order_qty: 5, received_qty: 0 },
        ],
      };
      manager.findOne.mockResolvedValue(po);

      const result = await service.receiveGoods({
        po_id: 'po-1',
        received_by: 'u1',
        lines: [
          { po_line_id: 'pol-UNKNOWN', received_qty: 2, serial_numbers: [] },
        ],
      } as any);

      expect(result.data).toBeDefined();
    });

    it('sinh SerialNumber entities khi product có serial_numbers', async () => {
      const po = {
        id: 'po-1',
        status: PoStatus.APPROVED,
        lines: [
          { id: 'pol-1', product_id: 'p1', order_qty: 2, received_qty: 0 },
        ],
      };
      manager.findOne.mockResolvedValue(po);

      await service.receiveGoods({
        po_id: 'po-1',
        received_by: 'u1',
        lines: [
          {
            po_line_id: 'pol-1',
            received_qty: 2,
            serial_numbers: ['SN001', 'SN002'],
          },
        ],
      } as any);

      // manager.create được gọi cho SerialNumber (ngoài GoodsReceiptLine + GRN)
      const serialCalls = manager.create.mock.calls.filter(
        (c) => c[0]?.name === 'SerialNumber',
      );
      expect(serialCalls.length).toBe(2);
    });
  });
});
