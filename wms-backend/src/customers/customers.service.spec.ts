import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

import { CustomersService } from './customers.service';
import { Customer } from './entities/customer.entity';
import { CustomerType } from '../sales/enums/sales.enum';

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  save: jest.fn((x) => ({ id: 'uuid', ...x })),
  create: jest.fn((x) => x),
  count: jest.fn().mockResolvedValue(0),
});

describe('CustomersService', () => {
  let service: CustomersService;
  let repo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    jest.clearAllMocks();
    const repoMock = mockRepo();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: getRepositoryToken(Customer), useValue: repoMock },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    repo = repoMock;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create()', () => {
    it('sinh customer_code đúng pattern CUS-YYMMDD-XXX', async () => {
      repo.count.mockResolvedValue(0);
      const result = await service.create({
        name: 'Công ty ABC',
        customer_type: CustomerType.CORPORATE,
      } as any);

      const customer = result.data as any;
      expect(customer.customer_code).toMatch(/^CUS-\d{6}-001$/);
    });
  });

  describe('findOne()', () => {
    it('throws NotFound khi ID không tồn tại', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getDebt()', () => {
    it('tính available = limit - current_debt', async () => {
      repo.findOne.mockResolvedValue({
        id: 'c1',
        customer_code: 'CUS-260416-001',
        credit_limit: 100_000_000,
        current_debt: 30_000_000,
      });
      const result = await service.getDebt('c1');
      expect((result.data as any).available).toBe(70_000_000);
    });
  });

  describe('adjustDebt()', () => {
    it('cộng debt OK', async () => {
      const customer = {
        id: 'c1',
        current_debt: 10_000_000,
      };
      repo.findOne.mockResolvedValue(customer);
      await service.adjustDebt('c1', 5_000_000);
      expect(customer.current_debt).toBe(15_000_000);
      expect(repo.save).toHaveBeenCalled();
    });

    it('throws khi debt âm', async () => {
      repo.findOne.mockResolvedValue({
        id: 'c1',
        current_debt: 1_000_000,
      });
      await expect(service.adjustDebt('c1', -5_000_000)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws NotFound khi customer không tồn tại', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.adjustDebt('missing', 100)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('softDelete() / restore()', () => {
    it('softDelete set is_active=false', async () => {
      const customer = { id: 'c1', is_active: true, customer_code: 'X' };
      repo.findOne.mockResolvedValue(customer);
      await service.softDelete('c1');
      expect(customer.is_active).toBe(false);
    });

    it('restore set is_active=true', async () => {
      const customer = { id: 'c1', is_active: false, customer_code: 'X' };
      repo.findOne.mockResolvedValue(customer);
      await service.restore('c1');
      expect(customer.is_active).toBe(true);
    });
  });
});
