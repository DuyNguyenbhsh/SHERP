import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { OutboundService } from './outbound.service';
import { OutboundOrder } from './entities/outbound-order.entity';
import { OutboundLine } from './entities/outbound-line.entity';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { Location } from '../inventory/entities/location.entity';
import { ProjectBoqService } from '../projects/project-boq.service';
import { ProjectsService } from '../projects/projects.service';
import { OutboundStatus, OutboundType } from './enums/outbound.enum';

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn((x) => ({ id: 'uuid-1', ...x })),
  create: jest.fn((x) => x),
  count: jest.fn().mockResolvedValue(0),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getOne: jest.fn(),
  })),
});

const mockDataSource = {
  transaction: jest.fn((cb: unknown) =>
    typeof cb === 'function' ? (cb as (m: unknown) => unknown)({}) : undefined,
  ),
};

const mockBoqService = {
  checkBoqThreshold: jest
    .fn()
    .mockResolvedValue({ exceeded: false, remaining: Number.MAX_SAFE_INTEGER }),
};

const mockProjectsService = {
  checkBudgetLimit: jest.fn().mockResolvedValue({ ok: true }),
};

describe('OutboundService', () => {
  let service: OutboundService;
  let orderRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    jest.clearAllMocks();
    const orderRepoMock = mockRepo();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboundService,
        { provide: getRepositoryToken(OutboundOrder), useValue: orderRepoMock },
        { provide: getRepositoryToken(OutboundLine), useValue: mockRepo() },
        { provide: getRepositoryToken(InventoryItem), useValue: mockRepo() },
        { provide: getRepositoryToken(Location), useValue: mockRepo() },
        { provide: DataSource, useValue: mockDataSource },
        { provide: ProjectBoqService, useValue: mockBoqService },
        { provide: ProjectsService, useValue: mockProjectsService },
      ],
    }).compile();

    service = module.get<OutboundService>(OutboundService);
    orderRepo = orderRepoMock;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── create() ──
  describe('create()', () => {
    it('sinh mã order đúng pattern OB-YYMMDD-XXX', async () => {
      orderRepo.count.mockResolvedValue(0);
      const dto = {
        order_type: OutboundType.SALES_ORDER,
        customer_name: 'Khách A',
        lines: [{ product_id: 'p1', requested_qty: 5, lot_number: 'L1' }],
      } as any;

      const result = await service.create(dto);
      const order = result.data as any;
      expect(order.order_number).toMatch(/^OB-\d{6}-001$/);
    });

    it('chặn tạo phiếu khi BOQ threshold exceeded (project outbound)', async () => {
      mockBoqService.checkBoqThreshold.mockResolvedValueOnce({
        exceeded: true,
        remaining: 2,
      });

      const dto = {
        order_type: OutboundType.PRODUCTION,
        project_id: 'prj-1',
        lines: [{ product_id: 'p1', requested_qty: 100 }],
      } as any;

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('gọi checkBudgetLimit khi có project_id + category_id + estimated_amount', async () => {
      orderRepo.count.mockResolvedValue(2);
      const dto = {
        order_type: OutboundType.PRODUCTION,
        project_id: 'prj-1',
        category_id: 'cat-1',
        estimated_amount: 5000000,
        lines: [{ product_id: 'p1', requested_qty: 1 }],
      } as any;

      await service.create(dto);
      expect(mockProjectsService.checkBudgetLimit).toHaveBeenCalledWith(
        'prj-1',
        'cat-1',
        5000000,
        expect.objectContaining({
          transaction_ref: expect.stringMatching(/^OB-/),
        }),
      );
    });
  });

  // ── findAll() ──
  describe('findAll()', () => {
    it('filter theo OutboundStatus hợp lệ', async () => {
      orderRepo.find.mockResolvedValue([]);
      await service.findAll(OutboundStatus.SHIPPED);
      expect(orderRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: OutboundStatus.SHIPPED },
        }),
      );
    });

    it('bỏ qua status không hợp lệ', async () => {
      orderRepo.find.mockResolvedValue([]);
      await service.findAll('NOT_A_STATUS');
      expect(orderRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });
  });

  // ── findOne() ──
  describe('findOne()', () => {
    it('throws NotFoundException khi ID không tồn tại', async () => {
      orderRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── updateStatus() ──
  describe('updateStatus()', () => {
    it('chặn khi phiếu đã SHIPPED', async () => {
      orderRepo.findOne.mockResolvedValue({
        id: 'uuid-1',
        status: OutboundStatus.SHIPPED,
      });
      await expect(
        service.updateStatus('uuid-1', {
          status: OutboundStatus.PACKED,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('chặn khi phiếu đã CANCELED', async () => {
      orderRepo.findOne.mockResolvedValue({
        id: 'uuid-1',
        status: OutboundStatus.CANCELED,
      });
      await expect(
        service.updateStatus('uuid-1', {
          status: OutboundStatus.PACKED,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
