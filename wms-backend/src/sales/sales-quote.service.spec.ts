import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

import { SalesQuoteService } from './sales-quote.service';
import { SalesQuote } from './entities/sales-quote.entity';
import { SalesQuoteLine } from './entities/sales-quote-line.entity';
import { Customer } from '../customers/entities/customer.entity';
import { QuoteStatus } from './enums/sales.enum';

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  save: jest.fn((x) => ({ id: 'uuid', ...x })),
  create: jest.fn((x) => x),
  count: jest.fn().mockResolvedValue(0),
  delete: jest.fn().mockResolvedValue({ affected: 1 }),
  createQueryBuilder: jest.fn(() => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 0 }),
    getMany: jest.fn().mockResolvedValue([]),
  })),
});

const mockDataSource = {
  transaction: jest.fn((cb: (m: unknown) => unknown) => cb({})),
};

describe('SalesQuoteService', () => {
  let service: SalesQuoteService;
  let quoteRepo: ReturnType<typeof mockRepo>;
  let customerRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    jest.clearAllMocks();
    const quoteRepoMock = mockRepo();
    const lineRepoMock = mockRepo();
    const customerRepoMock = mockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesQuoteService,
        { provide: getRepositoryToken(SalesQuote), useValue: quoteRepoMock },
        {
          provide: getRepositoryToken(SalesQuoteLine),
          useValue: lineRepoMock,
        },
        { provide: getRepositoryToken(Customer), useValue: customerRepoMock },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<SalesQuoteService>(SalesQuoteService);
    quoteRepo = quoteRepoMock;
    customerRepo = customerRepoMock;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create()', () => {
    const activeCustomer = {
      id: 'c1',
      is_active: true,
      is_blacklisted: false,
    };

    it('throws NotFound khi customer không tồn tại', async () => {
      customerRepo.findOne.mockResolvedValue(null);
      await expect(
        service.create({
          customer_id: 'missing',
          effective_date: '2026-04-16',
          expiry_date: '2026-05-16',
          lines: [{ product_id: 'p1', qty: 1, unit_price: 1000 }],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('chặn khi customer blacklisted', async () => {
      customerRepo.findOne.mockResolvedValue({
        ...activeCustomer,
        is_blacklisted: true,
      });
      await expect(
        service.create({
          customer_id: 'c1',
          effective_date: '2026-04-16',
          expiry_date: '2026-05-16',
          lines: [{ product_id: 'p1', qty: 1, unit_price: 1000 }],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('chặn khi customer inactive', async () => {
      customerRepo.findOne.mockResolvedValue({
        ...activeCustomer,
        is_active: false,
      });
      await expect(
        service.create({
          customer_id: 'c1',
          effective_date: '2026-04-16',
          expiry_date: '2026-05-16',
          lines: [{ product_id: 'p1', qty: 1, unit_price: 1000 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('tạo quote với pattern QT-YYMMDD-XXX + tính totals', async () => {
      customerRepo.findOne.mockResolvedValue(activeCustomer);
      quoteRepo.count.mockResolvedValue(0);

      const result = await service.create({
        customer_id: 'c1',
        effective_date: '2026-04-16',
        expiry_date: '2026-05-16',
        lines: [
          {
            product_id: 'p1',
            qty: 10,
            unit_price: 1000,
            tax_percent: 10,
          },
        ],
      });

      expect(result.status).toBe('success');
      const quote = result.data as any;
      expect(quote.quote_number).toMatch(/^QT-\d{6}-001$/);
      expect(quote.status).toBe(QuoteStatus.DRAFT);
      expect(quote.total_subtotal).toBe(10000);
      expect(quote.total_tax).toBe(1000);
      expect(quote.grand_total).toBe(11000);
    });
  });

  describe('transitionStatus()', () => {
    it('DRAFT → SENT allowed', async () => {
      quoteRepo.findOne.mockResolvedValue({
        id: 'q1',
        status: QuoteStatus.DRAFT,
        quote_number: 'QT-260416-001',
      });
      const result = await service.send('q1');
      expect((result.data as any).status).toBe(QuoteStatus.SENT);
    });

    it('DRAFT → ACCEPTED chặn (phải qua SENT trước)', async () => {
      quoteRepo.findOne.mockResolvedValue({
        id: 'q1',
        status: QuoteStatus.DRAFT,
      });
      await expect(service.accept('q1')).rejects.toThrow(BadRequestException);
    });

    it('ACCEPTED → anything chặn (final state)', async () => {
      quoteRepo.findOne.mockResolvedValue({
        id: 'q1',
        status: QuoteStatus.ACCEPTED,
      });
      await expect(service.reject('q1')).rejects.toThrow(BadRequestException);
    });

    it('SENT → ACCEPTED OK, SENT → REJECTED OK', async () => {
      quoteRepo.findOne.mockResolvedValue({
        id: 'q1',
        status: QuoteStatus.SENT,
        quote_number: 'QT-260416-001',
      });
      await expect(service.accept('q1')).resolves.toBeDefined();

      quoteRepo.findOne.mockResolvedValue({
        id: 'q2',
        status: QuoteStatus.SENT,
        quote_number: 'QT-260416-002',
      });
      await expect(service.reject('q2')).resolves.toBeDefined();
    });
  });

  describe('cancel()', () => {
    it('chặn khi quote không ở DRAFT', async () => {
      quoteRepo.findOne.mockResolvedValue({
        id: 'q1',
        status: QuoteStatus.SENT,
      });
      await expect(service.cancel('q1')).rejects.toThrow(BadRequestException);
    });

    it('xóa quote DRAFT thành công', async () => {
      quoteRepo.findOne.mockResolvedValue({
        id: 'q1',
        status: QuoteStatus.DRAFT,
        quote_number: 'QT-260416-001',
      });
      const result = await service.cancel('q1');
      expect(result.status).toBe('success');
      expect(quoteRepo.delete).toHaveBeenCalledWith('q1');
    });
  });
});
