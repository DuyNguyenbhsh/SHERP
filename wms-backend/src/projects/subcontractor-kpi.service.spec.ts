/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/require-await */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { SubcontractorKpiService } from './subcontractor-kpi.service';
import { SubcontractorKpi } from './entities/subcontractor-kpi.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { CreateSubcontractorKpiDto } from './dto/create-subcontractor-kpi.dto';

describe('SubcontractorKpiService', () => {
  let service: SubcontractorKpiService;

  const mockKpiRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockSupplierRepo = {
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubcontractorKpiService,
        {
          provide: getRepositoryToken(SubcontractorKpi),
          useValue: mockKpiRepo,
        },
        {
          provide: getRepositoryToken(Supplier),
          useValue: mockSupplierRepo,
        },
      ],
    }).compile();

    service = module.get<SubcontractorKpiService>(SubcontractorKpiService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // create()
  // ---------------------------------------------------------------------------
  describe('create()', () => {
    const supplierId = 'supplier-uuid-1';

    it('should create a KPI with PASS when totalScore >= 60', async () => {
      const dto: CreateSubcontractorKpiDto = {
        evaluation_date: '2026-04-06',
        criteria: [
          { name: 'Chat luong', weight: 50, score: 45, max_score: 50 },
          { name: 'Tien do', weight: 50, score: 40, max_score: 50 },
        ],
      };

      // (45/50)*50 + (40/50)*50 = 45 + 40 = 85; 85/100*100 = 85
      const expectedScore = 85;
      const expectedEntity = {
        id: 'kpi-uuid-1',
        ...dto,
        supplier_id: supplierId,
        total_score: expectedScore,
        result: 'PASS',
      } as unknown as SubcontractorKpi;

      mockKpiRepo.create.mockReturnValue(expectedEntity);
      mockKpiRepo.save.mockResolvedValue(expectedEntity);

      const result = await service.create(supplierId, dto);

      expect(mockKpiRepo.create).toHaveBeenCalledWith({
        ...dto,
        supplier_id: supplierId,
        total_score: expectedScore,
        result: 'PASS',
      });
      expect(mockKpiRepo.save).toHaveBeenCalledWith(expectedEntity);
      expect(result).toEqual(expectedEntity);
    });

    it('should create a KPI with FAIL when totalScore < 60', async () => {
      const dto: CreateSubcontractorKpiDto = {
        evaluation_date: '2026-04-06',
        criteria: [
          { name: 'Chat luong', weight: 50, score: 10, max_score: 50 },
          { name: 'Tien do', weight: 50, score: 15, max_score: 50 },
        ],
      };

      // (10/50)*50 + (15/50)*50 = 10 + 15 = 25; 25/100*100 = 25
      const expectedScore = 25;
      const expectedEntity = {
        ...dto,
        supplier_id: supplierId,
        total_score: expectedScore,
        result: 'FAIL',
      } as unknown as SubcontractorKpi;

      mockKpiRepo.create.mockReturnValue(expectedEntity);
      mockKpiRepo.save.mockResolvedValue(expectedEntity);

      const result = await service.create(supplierId, dto);

      expect(mockKpiRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          total_score: expectedScore,
          result: 'FAIL',
        }),
      );
      expect(result.result).toBe('FAIL');
    });

    it('should create a KPI with PASS when totalScore is exactly 60', async () => {
      const dto: CreateSubcontractorKpiDto = {
        evaluation_date: '2026-04-06',
        criteria: [
          { name: 'Chat luong', weight: 100, score: 60, max_score: 100 },
        ],
      };

      const expectedEntity = {
        ...dto,
        supplier_id: supplierId,
        total_score: 60,
        result: 'PASS',
      } as unknown as SubcontractorKpi;

      mockKpiRepo.create.mockReturnValue(expectedEntity);
      mockKpiRepo.save.mockResolvedValue(expectedEntity);

      await service.create(supplierId, dto);

      expect(mockKpiRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          total_score: 60,
          result: 'PASS',
        }),
      );
    });

    it('should create a KPI with FAIL when totalScore is 59.99', async () => {
      const dto: CreateSubcontractorKpiDto = {
        evaluation_date: '2026-04-06',
        criteria: [
          { name: 'Chat luong', weight: 100, score: 5999, max_score: 10000 },
        ],
      };

      const expectedEntity = {
        ...dto,
        supplier_id: supplierId,
        total_score: 59.99,
        result: 'FAIL',
      } as unknown as SubcontractorKpi;

      mockKpiRepo.create.mockReturnValue(expectedEntity);
      mockKpiRepo.save.mockResolvedValue(expectedEntity);

      await service.create(supplierId, dto);

      expect(mockKpiRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          total_score: 59.99,
          result: 'FAIL',
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // findBySupplierId()
  // ---------------------------------------------------------------------------
  describe('findBySupplierId()', () => {
    it('should return KPIs ordered by evaluation_date DESC', async () => {
      const supplierId = 'supplier-uuid-1';
      const mockKpis = [
        { id: '1', evaluation_date: new Date('2026-04-06') },
        { id: '2', evaluation_date: new Date('2026-03-01') },
      ] as SubcontractorKpi[];

      mockKpiRepo.find.mockResolvedValue(mockKpis);

      const result = await service.findBySupplierId(supplierId);

      expect(mockKpiRepo.find).toHaveBeenCalledWith({
        where: { supplier_id: supplierId },
        relations: ['project', 'approver'],
        order: { evaluation_date: 'DESC' },
      });
      expect(result).toEqual(mockKpis);
    });

    it('should return empty array when no KPIs found', async () => {
      mockKpiRepo.find.mockResolvedValue([]);

      const result = await service.findBySupplierId('non-existent');

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // findLatest()
  // ---------------------------------------------------------------------------
  describe('findLatest()', () => {
    it('should return most recent KPI for supplier', async () => {
      const supplierId = 'supplier-uuid-1';
      const mockKpi = {
        id: '1',
        supplier_id: supplierId,
        evaluation_date: new Date('2026-04-06'),
      } as SubcontractorKpi;

      mockKpiRepo.findOne.mockResolvedValue(mockKpi);

      const result = await service.findLatest(supplierId);

      expect(mockKpiRepo.findOne).toHaveBeenCalledWith({
        where: { supplier_id: supplierId },
        relations: ['project', 'approver'],
        order: { evaluation_date: 'DESC' },
      });
      expect(result).toEqual(mockKpi);
    });

    it('should return null when no KPI exists', async () => {
      mockKpiRepo.findOne.mockResolvedValue(null);

      const result = await service.findLatest('non-existent');

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // approve()
  // ---------------------------------------------------------------------------
  describe('approve()', () => {
    it('should set approved_by and approved_at for a PASS KPI', async () => {
      const kpiId = 'kpi-uuid-1';
      const userId = 'user-uuid-1';
      const existingKpi = {
        id: kpiId,
        total_score: 85,
        result: 'PASS',
        supplier_id: 'supplier-uuid-1',
      } as SubcontractorKpi;

      mockKpiRepo.findOne.mockResolvedValue(existingKpi);
      mockKpiRepo.save.mockImplementation(
        async (entity) => entity as SubcontractorKpi,
      );

      const result = await service.approve(kpiId, userId);

      expect(mockKpiRepo.findOne).toHaveBeenCalledWith({
        where: { id: kpiId },
        relations: ['supplier'],
      });
      expect(result.approved_by).toBe(userId);
      expect(result.approved_at).toBeInstanceOf(Date);
      expect(mockKpiRepo.save).toHaveBeenCalled();
      // PASS result should NOT blacklist the supplier
      expect(mockSupplierRepo.update).not.toHaveBeenCalled();
    });

    it('should blacklist supplier when approving a FAIL KPI', async () => {
      const kpiId = 'kpi-uuid-2';
      const userId = 'user-uuid-1';
      const supplierId = 'supplier-uuid-fail';
      const existingKpi = {
        id: kpiId,
        total_score: 40,
        result: 'FAIL',
        supplier_id: supplierId,
      } as SubcontractorKpi;

      mockKpiRepo.findOne.mockResolvedValue(existingKpi);
      mockKpiRepo.save.mockImplementation(
        async (entity) => entity as SubcontractorKpi,
      );
      mockSupplierRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.approve(kpiId, userId);

      expect(result.approved_by).toBe(userId);
      expect(result.approved_at).toBeInstanceOf(Date);
      // FAIL result should blacklist the supplier
      expect(mockSupplierRepo.update).toHaveBeenCalledWith(supplierId, {
        is_blacklisted: true,
      });
    });

    it('should throw NotFoundException when KPI not found', async () => {
      mockKpiRepo.findOne.mockResolvedValue(null);

      await expect(
        service.approve('non-existent', 'user-uuid-1'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.approve('non-existent', 'user-uuid-1'),
      ).rejects.toThrow('Danh gia KPI khong ton tai');
    });
  });

  // ---------------------------------------------------------------------------
  // findFailed()
  // ---------------------------------------------------------------------------
  describe('findFailed()', () => {
    it('should return only FAIL results ordered by evaluation_date DESC', async () => {
      const mockKpis = [
        { id: '1', result: 'FAIL', total_score: 45 },
        { id: '2', result: 'FAIL', total_score: 30 },
      ] as SubcontractorKpi[];

      mockKpiRepo.find.mockResolvedValue(mockKpis);

      const result = await service.findFailed();

      expect(mockKpiRepo.find).toHaveBeenCalledWith({
        where: { result: 'FAIL' },
        relations: ['supplier', 'project'],
        order: { evaluation_date: 'DESC' },
      });
      expect(result).toEqual(mockKpis);
      expect(result.every((kpi) => kpi.result === 'FAIL')).toBe(true);
    });

    it('should return empty array when no failed KPIs exist', async () => {
      mockKpiRepo.find.mockResolvedValue([]);

      const result = await service.findFailed();

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // calculateScore() — 100% coverage required
  // ---------------------------------------------------------------------------
  describe('calculateScore()', () => {
    // Access private method for thorough testing
    let calculateScore: (
      criteria: { weight: number; score: number; max_score: number }[],
    ) => number;

    beforeEach(() => {
      calculateScore = (service as any).calculateScore.bind(service);
    });

    it('should calculate weighted average correctly (normal case)', () => {
      const criteria = [
        { weight: 30, score: 25, max_score: 30 },
        { weight: 40, score: 35, max_score: 40 },
        { weight: 30, score: 20, max_score: 30 },
      ];
      // (25/30)*30 + (35/40)*40 + (20/30)*30 = 25 + 35 + 20 = 80
      // 80 / 100 * 100 = 80.00
      expect(calculateScore(criteria)).toBe(80);
    });

    it('should return 0 when totalWeight is 0', () => {
      const criteria = [
        { weight: 0, score: 10, max_score: 20 },
        { weight: 0, score: 15, max_score: 30 },
      ];
      expect(calculateScore(criteria)).toBe(0);
    });

    it('should return 0 for empty criteria array', () => {
      expect(calculateScore([])).toBe(0);
    });

    it('should handle mixed weights and scores', () => {
      const criteria = [
        { weight: 10, score: 8, max_score: 10 },
        { weight: 20, score: 12, max_score: 20 },
        { weight: 70, score: 35, max_score: 70 },
      ];
      // (8/10)*10 + (12/20)*20 + (35/70)*70 = 8 + 12 + 35 = 55
      // 55 / 100 * 100 = 55.00
      expect(calculateScore(criteria)).toBe(55);
    });

    it('should round to 2 decimal places', () => {
      const criteria = [
        { weight: 30, score: 7, max_score: 10 },
        { weight: 70, score: 6, max_score: 10 },
      ];
      // (7/10)*30 + (6/10)*70 = 21 + 42 = 63
      // 63 / 100 * 100 = 63.00
      expect(calculateScore(criteria)).toBe(63);
    });

    it('should round correctly when result has many decimal places', () => {
      const criteria = [
        { weight: 33, score: 7, max_score: 10 },
        { weight: 33, score: 8, max_score: 10 },
        { weight: 34, score: 9, max_score: 10 },
      ];
      // (7/10)*33 + (8/10)*33 + (9/10)*34 = 23.1 + 26.4 + 30.6 = 80.1
      // 80.1 / 100 * 100 = 80.1
      expect(calculateScore(criteria)).toBe(80.1);
    });

    it('should handle single criterion', () => {
      const criteria = [{ weight: 100, score: 75, max_score: 100 }];
      expect(calculateScore(criteria)).toBe(75);
    });

    it('should handle perfect score (100%)', () => {
      const criteria = [
        { weight: 50, score: 50, max_score: 50 },
        { weight: 50, score: 50, max_score: 50 },
      ];
      expect(calculateScore(criteria)).toBe(100);
    });

    it('should handle zero scores', () => {
      const criteria = [
        { weight: 50, score: 0, max_score: 50 },
        { weight: 50, score: 0, max_score: 50 },
      ];
      expect(calculateScore(criteria)).toBe(0);
    });

    it('should handle unequal weights correctly', () => {
      const criteria = [
        { weight: 10, score: 10, max_score: 10 }, // 100% of weight 10
        { weight: 90, score: 0, max_score: 90 }, // 0% of weight 90
      ];
      // (10/10)*10 + (0/90)*90 = 10 + 0 = 10; 10/100*100 = 10
      expect(calculateScore(criteria)).toBe(10);
    });

    it('should produce accurate rounding for repeating decimals', () => {
      const criteria = [{ weight: 33, score: 1, max_score: 3 }];
      // (1/3)*33 = 11; 11/33*100 = 33.333...
      // Math.round(33.333... * 100) / 100 = 33.33
      expect(calculateScore(criteria)).toBe(33.33);
    });

    it('should handle fractional weights', () => {
      const criteria = [
        { weight: 0.5, score: 8, max_score: 10 },
        { weight: 0.5, score: 6, max_score: 10 },
      ];
      // (8/10)*0.5 + (6/10)*0.5 = 0.4 + 0.3 = 0.7
      // 0.7 / 1.0 * 100 = 70
      expect(calculateScore(criteria)).toBe(70);
    });
  });
});
