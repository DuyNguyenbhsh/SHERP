import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { InboundService } from './inbound.service';
import { InboundReceipt } from './entities/inbound-receipt.entity';
import { InboundLine } from './entities/inbound-line.entity';
import { Location } from '../inventory/entities/location.entity';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { InboundStatus, InboundType } from './enums/inbound.enum';

// ── Mocks ──
const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
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

describe('InboundService', () => {
  let service: InboundService;
  let receiptRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const receiptRepoMock = mockRepo();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InboundService,
        {
          provide: getRepositoryToken(InboundReceipt),
          useValue: receiptRepoMock,
        },
        { provide: getRepositoryToken(InboundLine), useValue: mockRepo() },
        { provide: getRepositoryToken(Location), useValue: mockRepo() },
        { provide: getRepositoryToken(InventoryItem), useValue: mockRepo() },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<InboundService>(InboundService);
    receiptRepo = receiptRepoMock;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── create() ──
  describe('create()', () => {
    it('sinh mã receipt đúng pattern IBR-YYMMDD-XXX khi count=0', async () => {
      receiptRepo.count.mockResolvedValue(0);
      receiptRepo.save.mockImplementation(async (r) => ({
        id: 'uuid-1',
        ...r,
      }));

      const dto = {
        receipt_type: InboundType.PO_RECEIPT,
        po_id: 'po-1',
        warehouse_code: 'WH-HCM-01',
        lines: [
          {
            product_id: 'p1',
            expected_qty: 10,
            received_qty: 0,
            lot_number: 'L1',
          },
        ],
      } as any;

      const result = await service.create(dto);

      expect(result.status).toBe('success');
      const receipt = result.data as any;
      expect(receipt.receipt_number).toMatch(/^IBR-\d{6}-001$/);
    });

    it('sinh mã sequential khi đã có phiếu trước đó', async () => {
      receiptRepo.count.mockResolvedValue(4);
      receiptRepo.save.mockImplementation(async (r) => r);

      const result = await service.create({
        receipt_type: InboundType.PO_RECEIPT,
        lines: [],
      } as any);

      const receipt = result.data as any;
      expect(receipt.receipt_number).toMatch(/^IBR-\d{6}-005$/);
    });
  });

  // ── findAll() ──
  describe('findAll()', () => {
    it('trả về empty khi không có phiếu', async () => {
      receiptRepo.find.mockResolvedValue([]);
      const result = await service.findAll();
      expect(result.data).toEqual([]);
      expect(receiptRepo.find).toHaveBeenCalledWith({
        where: {},
        relations: ['lines'],
        order: { created_at: 'DESC' },
      });
    });

    it('filter theo InboundStatus hợp lệ', async () => {
      receiptRepo.find.mockResolvedValue([]);
      await service.findAll(InboundStatus.COMPLETED);
      expect(receiptRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: InboundStatus.COMPLETED },
        }),
      );
    });

    it('bỏ qua status không hợp lệ (không inject vào where)', async () => {
      receiptRepo.find.mockResolvedValue([]);
      await service.findAll('INVALID_STATUS');
      expect(receiptRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });
  });

  // ── findOne() ──
  describe('findOne()', () => {
    it('throws NotFoundException khi ID không tồn tại', async () => {
      receiptRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('trả về phiếu khi tồn tại', async () => {
      const mockReceipt = { id: 'uuid-1', receipt_number: 'IBR-260314-001' };
      receiptRepo.findOne.mockResolvedValue(mockReceipt);
      const result = await service.findOne('uuid-1');
      expect(result.data).toEqual(mockReceipt);
    });
  });

  // ── updateStatus() ──
  describe('updateStatus()', () => {
    it('chặn khi phiếu đã COMPLETED', async () => {
      receiptRepo.findOne.mockResolvedValue({
        id: 'uuid-1',
        status: InboundStatus.COMPLETED,
      });
      await expect(
        service.updateStatus('uuid-1', {
          status: InboundStatus.PUTAWAY,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('chặn khi phiếu đã REJECTED', async () => {
      receiptRepo.findOne.mockResolvedValue({
        id: 'uuid-1',
        status: InboundStatus.REJECTED,
      });
      await expect(
        service.updateStatus('uuid-1', {
          status: InboundStatus.PUTAWAY,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException khi phiếu không tồn tại', async () => {
      receiptRepo.findOne.mockResolvedValue(null);
      await expect(
        service.updateStatus('missing', {
          status: InboundStatus.PUTAWAY,
        } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
