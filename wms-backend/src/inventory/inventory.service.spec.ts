import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { InventoryService } from './inventory.service';
import { InventoryItem } from './entities/inventory-item.entity';
import { Location } from './entities/location.entity';
import { StockStatus } from './enums/inventory.enum';

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn((x) => x),
  create: jest.fn((x) => x),
  count: jest.fn().mockResolvedValue(0),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
    getRawMany: jest.fn().mockResolvedValue([]),
    getMany: jest.fn().mockResolvedValue([]),
  })),
});

const createManagerMock = () => ({
  findOne: jest.fn(),
  save: jest.fn((_entity, x) => (typeof x === 'object' ? x : _entity)),
  create: jest.fn((_entity, x) => x),
});

describe('InventoryService', () => {
  let service: InventoryService;
  let locationRepo: ReturnType<typeof mockRepo>;
  let inventoryRepo: ReturnType<typeof mockRepo>;
  let manager: ReturnType<typeof createManagerMock>;

  beforeEach(async () => {
    jest.clearAllMocks();
    manager = createManagerMock();
    const mockDataSource = {
      transaction: jest.fn((cb: (m: unknown) => unknown) => cb(manager)),
    };
    const locationRepoMock = mockRepo();
    const inventoryRepoMock = mockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: getRepositoryToken(InventoryItem),
          useValue: inventoryRepoMock,
        },
        { provide: getRepositoryToken(Location), useValue: locationRepoMock },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    locationRepo = locationRepoMock;
    inventoryRepo = inventoryRepoMock;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── Locations ──
  describe('findOneLocation()', () => {
    it('throws NotFoundException khi location không tồn tại', async () => {
      locationRepo.findOne.mockResolvedValue(null);
      await expect(service.findOneLocation('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── adjustInventory() ──
  describe('adjustInventory()', () => {
    it('chặn khi giảm tồn kho mà không tìm thấy bản ghi', async () => {
      manager.findOne.mockResolvedValue(null);
      await expect(
        service.adjustInventory({
          product_id: 'p1',
          location_id: 'loc1',
          adjustment_qty: -5,
          reason: 'Hao hụt',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('chặn khi qty mới âm (tồn kho hiện tại không đủ để giảm)', async () => {
      manager.findOne.mockResolvedValue({
        id: 'inv-1',
        product_id: 'p1',
        qty_on_hand: 3,
      });
      await expect(
        service.adjustInventory({
          product_id: 'p1',
          location_id: 'loc1',
          adjustment_qty: -5,
          reason: 'Hao hụt',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('cộng qty khi bản ghi tồn tại', async () => {
      manager.findOne.mockResolvedValue({
        id: 'inv-1',
        product_id: 'p1',
        qty_on_hand: 10,
      });
      manager.save.mockImplementation(async (_entity, x) => x);

      const result = await service.adjustInventory({
        product_id: 'p1',
        location_id: 'loc1',
        adjustment_qty: 5,
        reason: 'Nhập thủ công',
      } as any);

      expect(result.status).toBe('success');
      expect((result.data as any).qty_on_hand).toBe(15);
    });

    it('tạo bản ghi mới khi chưa tồn tại và adjustment_qty > 0', async () => {
      manager.findOne
        .mockResolvedValueOnce(null) // InventoryItem not found
        .mockResolvedValueOnce({ id: 'loc1', warehouse_code: 'WH-01' }); // Location
      manager.save.mockImplementation(async (_entity, x) => ({
        id: 'new-inv',
        ...x,
      }));

      const result = await service.adjustInventory({
        product_id: 'p1',
        location_id: 'loc1',
        adjustment_qty: 20,
        reason: 'Kiểm kê dư',
      } as any);

      expect(result.status).toBe('success');
      expect(manager.create).toHaveBeenCalled();
    });
  });

  // ── transferInventory() ──
  describe('transferInventory()', () => {
    it('chặn khi tồn kho nguồn không đủ', async () => {
      manager.findOne.mockResolvedValue({
        id: 'inv-1',
        product_id: 'p1',
        qty_on_hand: 3,
      });
      await expect(
        service.transferInventory({
          product_id: 'p1',
          from_location_id: 'loc-A',
          to_location_id: 'loc-B',
          qty: 10,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('chặn khi không tìm thấy tồn kho nguồn', async () => {
      manager.findOne.mockResolvedValue(null);
      await expect(
        service.transferInventory({
          product_id: 'p1',
          from_location_id: 'loc-A',
          to_location_id: 'loc-B',
          qty: 1,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('cộng vào target tồn tại khi transfer', async () => {
      const source = { id: 'inv-A', product_id: 'p1', qty_on_hand: 20 };
      const target = { id: 'inv-B', product_id: 'p1', qty_on_hand: 5 };
      manager.findOne
        .mockResolvedValueOnce(source)
        .mockResolvedValueOnce(target);
      manager.save.mockImplementation(async (_entity, x) => x);

      const result = await service.transferInventory({
        product_id: 'p1',
        from_location_id: 'loc-A',
        to_location_id: 'loc-B',
        qty: 10,
      } as any);

      expect(result.status).toBe('success');
      expect((result.data as any).source_qty_remaining).toBe(10);
      expect((result.data as any).target_qty_current).toBe(15);
    });

    it('tạo target mới khi chưa có tồn kho tại destination', async () => {
      const source = { id: 'inv-A', product_id: 'p1', qty_on_hand: 20 };
      manager.findOne
        .mockResolvedValueOnce(source) // source
        .mockResolvedValueOnce(null) // target not found
        .mockResolvedValueOnce({ id: 'loc-B', warehouse_code: 'WH-02' }); // dest location
      manager.save.mockImplementation(async (_entity, x) => x);

      const result = await service.transferInventory({
        product_id: 'p1',
        from_location_id: 'loc-A',
        to_location_id: 'loc-B',
        qty: 8,
      } as any);

      expect(result.status).toBe('success');
      expect(manager.create).toHaveBeenCalled();
      expect((result.data as any).source_qty_remaining).toBe(12);
      expect((result.data as any).target_qty_current).toBe(8);
    });
  });

  // ── getSummaryByProduct() ──
  describe('getSummaryByProduct()', () => {
    it('trả về default khi không có bản ghi', async () => {
      inventoryRepo.createQueryBuilder.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(undefined),
      } as any);

      const result = await service.getSummaryByProduct('p-missing');
      expect(result.data).toEqual({
        product_id: 'p-missing',
        total_on_hand: 0,
        total_reserved: 0,
        total_available: 0,
      });
    });

    it('filter đúng theo AVAILABLE status', async () => {
      const andWhereMock = jest.fn().mockReturnThis();
      inventoryRepo.createQueryBuilder.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: andWhereMock,
        groupBy: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          product_id: 'p1',
          total_on_hand: '50',
          total_reserved: '10',
          total_available: '40',
        }),
      } as any);

      await service.getSummaryByProduct('p1');
      expect(andWhereMock).toHaveBeenCalledWith('inv.status = :status', {
        status: StockStatus.AVAILABLE,
      });
    });
  });
});
