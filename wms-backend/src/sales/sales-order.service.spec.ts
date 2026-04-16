import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

import { SalesOrderService } from './sales-order.service';
import { SalesOrder } from './entities/sales-order.entity';
import { SalesOrderLine } from './entities/sales-order-line.entity';
import { SalesQuote } from './entities/sales-quote.entity';
import { Customer } from '../customers/entities/customer.entity';
import { CustomersService } from '../customers/customers.service';
import { OutboundService } from '../outbound/outbound.service';
import { SalesOrderStatus, QuoteStatus } from './enums/sales.enum';

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  save: jest.fn((x) => ({ id: 'uuid', ...x })),
  create: jest.fn((x) => x),
  count: jest.fn().mockResolvedValue(0),
  createQueryBuilder: jest.fn(() => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  })),
});

const createManagerMock = () => ({
  findOne: jest.fn(),
  save: jest.fn((entityOrTarget: unknown, payload?: unknown) => {
    if (payload === undefined) {
      return Promise.resolve({
        id: 'uuid',
        ...(entityOrTarget as object),
      });
    }
    return Promise.resolve(
      Array.isArray(payload) ? payload : { id: 'uuid', ...(payload as object) },
    );
  }),
  create: jest.fn((_entity, x) => x),
});

describe('SalesOrderService', () => {
  let service: SalesOrderService;
  let orderRepo: ReturnType<typeof mockRepo>;
  let quoteRepo: ReturnType<typeof mockRepo>;
  let customerRepo: ReturnType<typeof mockRepo>;
  let manager: ReturnType<typeof createManagerMock>;
  let outboundService: { create: jest.Mock; findOne: jest.Mock };
  let customersService: { adjustDebt: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();
    manager = createManagerMock();
    const mockDataSource = {
      transaction: jest.fn((cb: (m: unknown) => unknown) => cb(manager)),
    };

    const orderRepoMock = mockRepo();
    const quoteRepoMock = mockRepo();
    const customerRepoMock = mockRepo();

    outboundService = {
      create: jest.fn().mockResolvedValue({
        data: { id: 'ob-1', order_number: 'OB-260416-001', status: 'PENDING' },
      }),
      findOne: jest.fn(),
    };

    customersService = {
      adjustDebt: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesOrderService,
        { provide: getRepositoryToken(SalesOrder), useValue: orderRepoMock },
        {
          provide: getRepositoryToken(SalesOrderLine),
          useValue: mockRepo(),
        },
        { provide: getRepositoryToken(SalesQuote), useValue: quoteRepoMock },
        { provide: getRepositoryToken(Customer), useValue: customerRepoMock },
        { provide: DataSource, useValue: mockDataSource },
        { provide: CustomersService, useValue: customersService },
        { provide: OutboundService, useValue: outboundService },
      ],
    }).compile();

    service = module.get<SalesOrderService>(SalesOrderService);
    orderRepo = orderRepoMock;
    quoteRepo = quoteRepoMock;
    customerRepo = customerRepoMock;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const activeCustomer = {
    id: 'c1',
    customer_code: 'CUS-260416-001',
    name: 'Khách A',
    primary_phone: '0901234567',
    shipping_address: 'Address',
    payment_term: 'COD',
    credit_limit: 100_000_000,
    current_debt: 0,
    is_active: true,
    is_blacklisted: false,
  };

  const baseDto = {
    customer_id: 'c1',
    lines: [{ product_id: 'p1', qty: 10, unit_price: 1_000_000 }],
  };

  const adminUser = { userId: 'u1', privileges: ['MANAGE_SALES'] };
  const bypassUser = {
    userId: 'u1',
    privileges: ['MANAGE_SALES', 'BYPASS_CREDIT_LIMIT'],
  };

  describe('create()', () => {
    it('throws NotFound khi customer không tồn tại', async () => {
      customerRepo.findOne.mockResolvedValue(null);
      await expect(service.create(baseDto as any, adminUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('chặn customer blacklisted', async () => {
      customerRepo.findOne.mockResolvedValue({
        ...activeCustomer,
        is_blacklisted: true,
      });
      await expect(service.create(baseDto as any, adminUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('chặn Quote convert nếu chưa ACCEPTED', async () => {
      customerRepo.findOne.mockResolvedValue(activeCustomer);
      quoteRepo.findOne.mockResolvedValue({
        id: 'q1',
        status: QuoteStatus.SENT,
        converted_to_so_id: null,
      });
      await expect(
        service.create({ ...baseDto, quote_id: 'q1' } as any, adminUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('chặn Quote đã convert 1 lần (duplicate)', async () => {
      customerRepo.findOne.mockResolvedValue(activeCustomer);
      quoteRepo.findOne.mockResolvedValue({
        id: 'q1',
        status: QuoteStatus.ACCEPTED,
        converted_to_so_id: 'existing-so',
      });
      await expect(
        service.create({ ...baseDto, quote_id: 'q1' } as any, adminUser),
      ).rejects.toThrow(/đã convert/);
    });

    it('credit limit hard block khi không có privilege', async () => {
      customerRepo.findOne.mockResolvedValue({
        ...activeCustomer,
        current_debt: 90_000_000,
      });
      // 10 * 1,000,000 = 10M base + VAT 10% = 11M → total 101M vs limit 100M (=> shortfall 1M)
      await expect(service.create(baseDto as any, adminUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('credit bypass yêu cầu bypass_reason', async () => {
      customerRepo.findOne.mockResolvedValue({
        ...activeCustomer,
        current_debt: 90_000_000,
      });
      await expect(service.create(baseDto as any, bypassUser)).rejects.toThrow(
        /Bắt buộc nhập lý do/,
      );
    });

    it('credit bypass với reason + privilege → allowed', async () => {
      customerRepo.findOne.mockResolvedValue({
        ...activeCustomer,
        current_debt: 90_000_000,
      });
      orderRepo.count.mockResolvedValue(0);

      const result = await service.create(
        { ...baseDto, bypass_reason: 'Khách VIP' } as any,
        bypassUser,
      );
      expect(result.status).toBe('success');
      const so = result.data as any;
      expect(so.is_credit_bypassed).toBe(true);
      expect(so.bypass_reason).toBe('Khách VIP');
    });

    it('tạo SO + Outbound + update debt (happy path)', async () => {
      customerRepo.findOne.mockResolvedValue(activeCustomer);
      orderRepo.count.mockResolvedValue(0);

      const result = await service.create(baseDto as any, adminUser);

      expect(result.status).toBe('success');
      const so = result.data as any;
      expect(so.order_number).toMatch(/^SO-\d{6}-001$/);
      expect(so.status).toBe(SalesOrderStatus.CONFIRMED);
      expect(so.grand_total).toBe(11_000_000); // 10M + 10% VAT
      expect(so.outbound_order_id).toBe('ob-1');
      // Outbound service được gọi
      expect(outboundService.create).toHaveBeenCalled();
    });
  });

  describe('cancel()', () => {
    it('throws NotFound khi SO không tồn tại', async () => {
      manager.findOne.mockResolvedValue(null);
      await expect(
        service.cancel('missing', { reason: 'test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('chặn cancel khi SO đã DELIVERED', async () => {
      manager.findOne.mockResolvedValue({
        id: 'so-1',
        status: SalesOrderStatus.DELIVERED,
        grand_total: 1_000_000,
        customer_id: 'c1',
      });
      await expect(service.cancel('so-1', { reason: 'test' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('chặn cancel khi Outbound đã PICKING', async () => {
      manager.findOne.mockResolvedValue({
        id: 'so-1',
        status: SalesOrderStatus.CONFIRMED,
        outbound_order_id: 'ob-1',
        grand_total: 1_000_000,
        customer_id: 'c1',
      });
      outboundService.findOne.mockResolvedValue({
        data: { id: 'ob-1', status: 'PICKING' },
      });
      await expect(
        service.cancel('so-1', { reason: 'khách đổi ý' }),
      ).rejects.toThrow(/Outbound đã ở trạng thái/);
    });

    it('cancel OK khi Outbound còn PENDING', async () => {
      const so = {
        id: 'so-1',
        order_number: 'SO-260416-001',
        status: SalesOrderStatus.CONFIRMED,
        outbound_order_id: 'ob-1',
        grand_total: 1_000_000,
        customer_id: 'c1',
        notes: null,
      };
      manager.findOne.mockResolvedValueOnce(so).mockResolvedValueOnce({
        ...activeCustomer,
        current_debt: 1_000_000,
      });
      outboundService.findOne.mockResolvedValue({
        data: { id: 'ob-1', status: 'PENDING' },
      });

      const result = await service.cancel('so-1', { reason: 'khách hủy' });
      expect(result.status).toBe('success');
      expect(so.status).toBe(SalesOrderStatus.CANCELED);
    });
  });

  describe('getKpi()', () => {
    it('tính total_bookings + revenue_delivered đúng', async () => {
      orderRepo.createQueryBuilder = jest.fn(() => ({
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            status: SalesOrderStatus.DELIVERED,
            grand_total: 10_000_000,
          },
          {
            status: SalesOrderStatus.CONFIRMED,
            grand_total: 5_000_000,
          },
          {
            status: SalesOrderStatus.CANCELED,
            grand_total: 2_000_000,
          },
        ]),
      })) as any;

      const result = await service.getKpi();
      expect((result.data as any).total_bookings).toBe(15_000_000);
      expect((result.data as any).revenue_delivered).toBe(10_000_000);
      expect((result.data as any).total_orders).toBe(3);
    });
  });
});
