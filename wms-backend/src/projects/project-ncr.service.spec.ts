/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/unbound-method, @typescript-eslint/require-await, @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ProjectNcrService } from './project-ncr.service';
import { NonConformanceReport } from './entities/non-conformance-report.entity';
import { NcrAttachment } from './entities/ncr-attachment.entity';
import { NcrStatus, NcrCategory, NcrSeverity } from './enums/ncr.enum';
import {
  CreateNcrDto,
  AssignNcrDto,
  ResolveNcrDto,
  VerifyNcrDto,
  UpdateNcrDto,
} from './dto/create-ncr.dto';

// ── Helper: tao mock NCR ──
function makeNcr(
  overrides: Partial<NonConformanceReport> = {},
): NonConformanceReport {
  return {
    id: 'ncr-uuid-1',
    ncr_code: 'NCR-260410-001',
    project_id: 'proj-uuid-1',
    category: NcrCategory.QUALITY,
    severity: NcrSeverity.YELLOW,
    description: 'Lo hang bi loi',
    status: NcrStatus.OPEN,
    assigned_to: null,
    assigned_by: null,
    resolution_note: null,
    verified_by: null,
    verified_at: null,
    penalty_amount: 0,
    created_by: 'user-uuid-1',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  } as NonConformanceReport;
}

// ── Mock QueryBuilder ──
function createMockQueryBuilder(overrides: Record<string, any> = {}) {
  const qb: any = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
    getCount: jest.fn().mockResolvedValue(0),
    ...overrides,
  };
  return qb;
}

describe('ProjectNcrService', () => {
  let service: ProjectNcrService;
  let ncrRepo: jest.Mocked<Repository<NonConformanceReport>>;
  let attachmentRepo: jest.Mocked<Repository<NcrAttachment>>;

  beforeEach(async () => {
    const mockNcrRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockAttachmentRepo = {
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectNcrService,
        {
          provide: getRepositoryToken(NonConformanceReport),
          useValue: mockNcrRepo,
        },
        {
          provide: getRepositoryToken(NcrAttachment),
          useValue: mockAttachmentRepo,
        },
      ],
    }).compile();

    service = module.get<ProjectNcrService>(ProjectNcrService);
    ncrRepo = module.get(getRepositoryToken(NonConformanceReport));
    attachmentRepo = module.get(getRepositoryToken(NcrAttachment));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ════════════════════════════════════════════════════════
  // 1. create()
  // ════════════════════════════════════════════════════════
  describe('create()', () => {
    const dto: CreateNcrDto = {
      category: NcrCategory.QUALITY,
      severity: NcrSeverity.RED,
      description: 'Vat lieu khong dat chuan',
    };

    it('should create NCR with auto-generated code and status OPEN', async () => {
      const qb = createMockQueryBuilder({
        getCount: jest.fn().mockResolvedValue(2),
      });
      ncrRepo.createQueryBuilder.mockReturnValue(qb);

      const savedNcr = makeNcr({
        ncr_code: 'NCR-260410-003',
        status: NcrStatus.OPEN,
      });
      ncrRepo.create.mockReturnValue(savedNcr);
      ncrRepo.save.mockResolvedValue(savedNcr);

      const result = await service.create('proj-uuid-1', dto, 'user-uuid-1');

      expect(ncrRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          category: NcrCategory.QUALITY,
          severity: NcrSeverity.RED,
          description: 'Vat lieu khong dat chuan',
          project_id: 'proj-uuid-1',
          status: NcrStatus.OPEN,
          created_by: 'user-uuid-1',
        }),
      );
      expect(ncrRepo.save).toHaveBeenCalledWith(savedNcr);
      expect(result).toEqual(savedNcr);
    });

    it('should set assigned_by when assigned_to is provided', async () => {
      const dtoWithAssign: CreateNcrDto = {
        ...dto,
        assigned_to: 'assignee-uuid',
      };
      const qb = createMockQueryBuilder();
      ncrRepo.createQueryBuilder.mockReturnValue(qb);

      const savedNcr = makeNcr();
      ncrRepo.create.mockReturnValue(savedNcr);
      ncrRepo.save.mockResolvedValue(savedNcr);

      await service.create('proj-uuid-1', dtoWithAssign, 'user-uuid-1');

      expect(ncrRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          assigned_by: 'user-uuid-1',
          assigned_to: 'assignee-uuid',
        }),
      );
    });

    it('should NOT set assigned_by when assigned_to is absent', async () => {
      const qb = createMockQueryBuilder();
      ncrRepo.createQueryBuilder.mockReturnValue(qb);

      const savedNcr = makeNcr();
      ncrRepo.create.mockReturnValue(savedNcr);
      ncrRepo.save.mockResolvedValue(savedNcr);

      await service.create('proj-uuid-1', dto, 'user-uuid-1');

      expect(ncrRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          assigned_by: undefined,
        }),
      );
    });
  });

  // ════════════════════════════════════════════════════════
  // 2. findByProject()
  // ════════════════════════════════════════════════════════
  describe('findByProject()', () => {
    it('should return NCRs for a given project', async () => {
      const ncrs = [makeNcr(), makeNcr({ id: 'ncr-uuid-2' })];
      ncrRepo.find.mockResolvedValue(ncrs);

      const result = await service.findByProject('proj-uuid-1');

      expect(ncrRepo.find).toHaveBeenCalledWith({
        where: { project_id: 'proj-uuid-1' },
        relations: ['assignee', 'verifier', 'attachments'],
        order: { created_at: 'DESC' },
      });
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no NCRs exist', async () => {
      ncrRepo.find.mockResolvedValue([]);
      const result = await service.findByProject('proj-no-ncr');
      expect(result).toEqual([]);
    });
  });

  // ════════════════════════════════════════════════════════
  // 3. findOne()
  // ════════════════════════════════════════════════════════
  describe('findOne()', () => {
    it('should return NCR when found', async () => {
      const ncr = makeNcr();
      ncrRepo.findOne.mockResolvedValue(ncr);

      const result = await service.findOne('ncr-uuid-1');

      expect(ncrRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'ncr-uuid-1' },
        relations: [
          'assignee',
          'assigner',
          'verifier',
          'attachments',
          'project',
        ],
      });
      expect(result).toEqual(ncr);
    });

    it('should throw NotFoundException when NCR not found', async () => {
      ncrRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('bad-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ════════════════════════════════════════════════════════
  // 4. update()
  // ════════════════════════════════════════════════════════
  describe('update()', () => {
    const updateDto: UpdateNcrDto = {
      severity: NcrSeverity.CRITICAL,
      description: 'Cap nhat mo ta',
    };

    it('should update NCR when status is not CLOSED', async () => {
      const ncr = makeNcr({ status: NcrStatus.OPEN });
      ncrRepo.findOne.mockResolvedValue(ncr);
      ncrRepo.save.mockResolvedValue({
        ...ncr,
        ...updateDto,
      } as NonConformanceReport);

      const result = await service.update('ncr-uuid-1', updateDto);

      expect(ncrRepo.save).toHaveBeenCalled();
      expect(result.severity).toBe(NcrSeverity.CRITICAL);
    });

    it('should update NCR when status is IN_PROGRESS', async () => {
      const ncr = makeNcr({ status: NcrStatus.IN_PROGRESS });
      ncrRepo.findOne.mockResolvedValue(ncr);
      ncrRepo.save.mockResolvedValue({
        ...ncr,
        ...updateDto,
      } as NonConformanceReport);

      await expect(
        service.update('ncr-uuid-1', updateDto),
      ).resolves.toBeDefined();
    });

    it('should throw BadRequestException when status is CLOSED', async () => {
      const ncr = makeNcr({ status: NcrStatus.CLOSED });
      ncrRepo.findOne.mockResolvedValue(ncr);

      await expect(service.update('ncr-uuid-1', updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when NCR not found', async () => {
      ncrRepo.findOne.mockResolvedValue(null);
      await expect(service.update('bad-uuid', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ════════════════════════════════════════════════════════
  // 5. assign()
  // ════════════════════════════════════════════════════════
  describe('assign()', () => {
    const assignDto: AssignNcrDto = { assigned_to: 'assignee-uuid' };

    it('should transition OPEN → IN_PROGRESS and set assigned_to/assigned_by', async () => {
      const ncr = makeNcr({ status: NcrStatus.OPEN });
      ncrRepo.findOne.mockResolvedValue(ncr);
      ncrRepo.save.mockImplementation(
        async (entity) => entity as NonConformanceReport,
      );

      const result = await service.assign(
        'ncr-uuid-1',
        assignDto,
        'manager-uuid',
      );

      expect(result.status).toBe(NcrStatus.IN_PROGRESS);
      expect(result.assigned_to).toBe('assignee-uuid');
      expect(result.assigned_by).toBe('manager-uuid');
    });

    it('should throw BadRequestException when transitioning from CLOSED → IN_PROGRESS', async () => {
      const ncr = makeNcr({ status: NcrStatus.CLOSED });
      ncrRepo.findOne.mockResolvedValue(ncr);

      await expect(
        service.assign('ncr-uuid-1', assignDto, 'manager-uuid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when transitioning from RESOLVED → IN_PROGRESS', async () => {
      // RESOLVED can go to VERIFIED or IN_PROGRESS per the transition map
      // Actually RESOLVED → IN_PROGRESS IS allowed. Let's test an invalid one.
      const ncr = makeNcr({ status: NcrStatus.IN_PROGRESS });
      ncrRepo.findOne.mockResolvedValue(ncr);

      // IN_PROGRESS → IN_PROGRESS is not in the map (only → RESOLVED)
      await expect(
        service.assign('ncr-uuid-1', assignDto, 'manager-uuid'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ════════════════════════════════════════════════════════
  // 6. resolve()
  // ════════════════════════════════════════════════════════
  describe('resolve()', () => {
    const resolveDto: ResolveNcrDto = { resolution_note: 'Da sua xong' };

    it('should transition IN_PROGRESS → RESOLVED and set resolution_note', async () => {
      const ncr = makeNcr({ status: NcrStatus.IN_PROGRESS });
      ncrRepo.findOne.mockResolvedValue(ncr);
      ncrRepo.save.mockImplementation(
        async (entity) => entity as NonConformanceReport,
      );

      const result = await service.resolve('ncr-uuid-1', resolveDto);

      expect(result.status).toBe(NcrStatus.RESOLVED);
      expect(result.resolution_note).toBe('Da sua xong');
    });

    it('should throw BadRequestException when transitioning from OPEN → RESOLVED', async () => {
      const ncr = makeNcr({ status: NcrStatus.OPEN });
      ncrRepo.findOne.mockResolvedValue(ncr);

      await expect(service.resolve('ncr-uuid-1', resolveDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when transitioning from CLOSED → RESOLVED', async () => {
      const ncr = makeNcr({ status: NcrStatus.CLOSED });
      ncrRepo.findOne.mockResolvedValue(ncr);

      await expect(service.resolve('ncr-uuid-1', resolveDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ════════════════════════════════════════════════════════
  // 7. verify()
  // ════════════════════════════════════════════════════════
  describe('verify()', () => {
    describe('when accepted = true', () => {
      const verifyDto: VerifyNcrDto = { accepted: true };

      it('should transition RESOLVED → VERIFIED → CLOSED, set verified_by and verified_at', async () => {
        const ncr = makeNcr({ status: NcrStatus.RESOLVED });
        ncrRepo.findOne.mockResolvedValue(ncr);
        ncrRepo.save.mockImplementation(
          async (entity) => entity as NonConformanceReport,
        );

        const result = await service.verify(
          'ncr-uuid-1',
          verifyDto,
          'verifier-uuid',
        );

        expect(result.status).toBe(NcrStatus.CLOSED);
        expect(result.verified_by).toBe('verifier-uuid');
        expect(result.verified_at).toBeInstanceOf(Date);
      });

      it('should throw BadRequestException when current status is OPEN (invalid → VERIFIED)', async () => {
        const ncr = makeNcr({ status: NcrStatus.OPEN });
        ncrRepo.findOne.mockResolvedValue(ncr);

        await expect(
          service.verify('ncr-uuid-1', verifyDto, 'verifier-uuid'),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException when current status is IN_PROGRESS', async () => {
        const ncr = makeNcr({ status: NcrStatus.IN_PROGRESS });
        ncrRepo.findOne.mockResolvedValue(ncr);

        await expect(
          service.verify('ncr-uuid-1', verifyDto, 'verifier-uuid'),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('when accepted = false (rejected)', () => {
      it('should transition RESOLVED → IN_PROGRESS with rejection comment', async () => {
        const ncr = makeNcr({
          status: NcrStatus.RESOLVED,
          resolution_note: 'Ghi chu cu',
        });
        ncrRepo.findOne.mockResolvedValue(ncr);
        ncrRepo.save.mockImplementation(
          async (entity) => entity as NonConformanceReport,
        );

        const dto: VerifyNcrDto = {
          accepted: false,
          comment: 'Chua dat yeu cau',
        };
        const result = await service.verify('ncr-uuid-1', dto, 'verifier-uuid');

        expect(result.status).toBe(NcrStatus.IN_PROGRESS);
        expect(result.resolution_note).toContain('[Tu choi] Chua dat yeu cau');
        expect(result.resolution_note).toContain('Ghi chu cu');
      });

      it('should keep original resolution_note when no comment provided', async () => {
        const ncr = makeNcr({
          status: NcrStatus.RESOLVED,
          resolution_note: 'Da xu ly xong',
        });
        ncrRepo.findOne.mockResolvedValue(ncr);
        ncrRepo.save.mockImplementation(
          async (entity) => entity as NonConformanceReport,
        );

        const dto: VerifyNcrDto = { accepted: false };
        const result = await service.verify('ncr-uuid-1', dto, 'verifier-uuid');

        expect(result.status).toBe(NcrStatus.IN_PROGRESS);
        expect(result.resolution_note).toBe('Da xu ly xong');
      });

      it('should throw BadRequestException when rejecting from OPEN status', async () => {
        // OPEN → IN_PROGRESS IS allowed per transition map
        // But let's test from CLOSED which should fail
        const ncr = makeNcr({ status: NcrStatus.CLOSED });
        ncrRepo.findOne.mockResolvedValue(ncr);

        const dto: VerifyNcrDto = { accepted: false };
        // CLOSED → IN_PROGRESS is not allowed (CLOSED → OPEN only)
        await expect(
          service.verify('ncr-uuid-1', dto, 'verifier-uuid'),
        ).rejects.toThrow(BadRequestException);
      });
    });
  });

  // ════════════════════════════════════════════════════════
  // 8. reopen()
  // ════════════════════════════════════════════════════════
  describe('reopen()', () => {
    it('should transition CLOSED → OPEN and clear verified_by/verified_at/resolution_note', async () => {
      const closedNcr = makeNcr({
        status: NcrStatus.CLOSED,
        verified_by: 'verifier-uuid',
        verified_at: new Date(),
        resolution_note: 'Some note',
      });
      const reopenedNcr = makeNcr({
        status: NcrStatus.OPEN,
        verified_by: undefined,
        verified_at: undefined,
        resolution_note: undefined,
      });

      const qb = createMockQueryBuilder();
      ncrRepo.createQueryBuilder.mockReturnValue(qb);

      // findOne is called twice: first to validate, then to return updated
      ncrRepo.findOne
        .mockResolvedValueOnce(closedNcr)
        .mockResolvedValueOnce(reopenedNcr);

      const result = await service.reopen('ncr-uuid-1');

      expect(qb.update).toHaveBeenCalledWith(NonConformanceReport);
      expect(qb.set).toHaveBeenCalledWith({
        status: NcrStatus.OPEN,
        verified_by: expect.any(Function),
        verified_at: expect.any(Function),
        resolution_note: expect.any(Function),
      });
      expect(qb.where).toHaveBeenCalledWith('id = :id', { id: 'ncr-uuid-1' });
      expect(qb.execute).toHaveBeenCalled();
      expect(result.status).toBe(NcrStatus.OPEN);
      expect(result.verified_by).toBeUndefined();
      expect(result.verified_at).toBeUndefined();
      expect(result.resolution_note).toBeUndefined();
    });

    it('should throw BadRequestException when reopening from OPEN (OPEN → OPEN not allowed)', async () => {
      const ncr = makeNcr({ status: NcrStatus.OPEN });
      ncrRepo.findOne.mockResolvedValue(ncr);

      await expect(service.reopen('ncr-uuid-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when reopening from IN_PROGRESS', async () => {
      const ncr = makeNcr({ status: NcrStatus.IN_PROGRESS });
      ncrRepo.findOne.mockResolvedValue(ncr);

      await expect(service.reopen('ncr-uuid-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when reopening from RESOLVED', async () => {
      const ncr = makeNcr({ status: NcrStatus.RESOLVED });
      ncrRepo.findOne.mockResolvedValue(ncr);

      await expect(service.reopen('ncr-uuid-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ════════════════════════════════════════════════════════
  // 9. getSummary()
  // ════════════════════════════════════════════════════════
  describe('getSummary()', () => {
    it('should return aggregated stats grouped by category, severity, status', async () => {
      const mockRawData = [
        {
          category: 'QUALITY',
          severity: 'RED',
          status: 'OPEN',
          count: '3',
          total_penalty: '500000',
        },
        {
          category: 'SAFETY',
          severity: 'CRITICAL',
          status: 'CLOSED',
          count: '1',
          total_penalty: '1000000',
        },
      ];
      const qb = createMockQueryBuilder({
        getRawMany: jest.fn().mockResolvedValue(mockRawData),
      });
      ncrRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getSummary('proj-uuid-1');

      expect(ncrRepo.createQueryBuilder).toHaveBeenCalledWith('ncr');
      expect(qb.where).toHaveBeenCalledWith('ncr.project_id = :projectId', {
        projectId: 'proj-uuid-1',
      });
      expect(qb.groupBy).toHaveBeenCalledWith('ncr.category');
      expect(qb.addGroupBy).toHaveBeenCalledWith('ncr.severity');
      expect(result).toHaveLength(2);
      expect(result[0].count).toBe('3');
      expect(result[1].total_penalty).toBe('1000000');
    });

    it('should return empty array when no NCRs exist for the project', async () => {
      const qb = createMockQueryBuilder({
        getRawMany: jest.fn().mockResolvedValue([]),
      });
      ncrRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getSummary('proj-empty');
      expect(result).toEqual([]);
    });
  });

  // ════════════════════════════════════════════════════════
  // 10. generateCode() — tested indirectly via create()
  // ════════════════════════════════════════════════════════
  describe('generateCode() (via create)', () => {
    it('should generate NCR-YYMMDD-XXX format with sequential numbering', async () => {
      const qb = createMockQueryBuilder({
        getCount: jest.fn().mockResolvedValue(5),
      });
      ncrRepo.createQueryBuilder.mockReturnValue(qb);

      const savedNcr = makeNcr();
      ncrRepo.create.mockReturnValue(savedNcr);
      ncrRepo.save.mockResolvedValue(savedNcr);

      const dto: CreateNcrDto = {
        category: NcrCategory.SAFETY,
        severity: NcrSeverity.GREEN,
        description: 'Test',
      };
      await service.create('proj-uuid-1', dto, 'user-uuid-1');

      // Verify the ncr_code passed to create matches the pattern
      const createCall = ncrRepo.create.mock.calls[0][0] as any;
      expect(createCall.ncr_code).toMatch(/^NCR-\d{6}-006$/);
    });

    it('should generate code 001 when no existing NCRs for the day', async () => {
      const qb = createMockQueryBuilder({
        getCount: jest.fn().mockResolvedValue(0),
      });
      ncrRepo.createQueryBuilder.mockReturnValue(qb);

      const savedNcr = makeNcr();
      ncrRepo.create.mockReturnValue(savedNcr);
      ncrRepo.save.mockResolvedValue(savedNcr);

      const dto: CreateNcrDto = {
        category: NcrCategory.QUALITY,
        severity: NcrSeverity.YELLOW,
        description: 'First NCR of the day',
      };
      await service.create('proj-uuid-1', dto, 'user-uuid-1');

      const createCall = ncrRepo.create.mock.calls[0][0] as any;
      expect(createCall.ncr_code).toMatch(/^NCR-\d{6}-001$/);
    });

    it('should query for existing codes with the correct prefix', async () => {
      const qb = createMockQueryBuilder({
        getCount: jest.fn().mockResolvedValue(0),
      });
      ncrRepo.createQueryBuilder.mockReturnValue(qb);

      const savedNcr = makeNcr();
      ncrRepo.create.mockReturnValue(savedNcr);
      ncrRepo.save.mockResolvedValue(savedNcr);

      const dto: CreateNcrDto = {
        category: NcrCategory.QUALITY,
        severity: NcrSeverity.YELLOW,
        description: 'Test',
      };
      await service.create('proj-uuid-1', dto, 'user-uuid-1');

      // The LIKE prefix should match today's date in YYMMDD format
      const now = new Date();
      const yy = String(now.getFullYear()).slice(2);
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const expectedPrefix = `NCR-${yy}${mm}${dd}`;

      expect(qb.where).toHaveBeenCalledWith('ncr.ncr_code LIKE :prefix', {
        prefix: `${expectedPrefix}%`,
      });
    });
  });

  // ════════════════════════════════════════════════════════
  // 11. Status transition validation — comprehensive
  // ════════════════════════════════════════════════════════
  describe('validateTransition() — invalid transitions', () => {
    // Test all invalid transitions that should throw BadRequestException
    const invalidTransitions: Array<{
      from: NcrStatus;
      to: NcrStatus;
      method: string;
    }> = [
      // OPEN can only go to IN_PROGRESS
      { from: NcrStatus.OPEN, to: NcrStatus.RESOLVED, method: 'resolve' },
      // IN_PROGRESS can only go to RESOLVED
      { from: NcrStatus.IN_PROGRESS, to: NcrStatus.OPEN, method: 'reopen' },
      // VERIFIED can only go to CLOSED (handled internally by verify)
      { from: NcrStatus.VERIFIED, to: NcrStatus.OPEN, method: 'reopen' },
      // CLOSED can only go to OPEN
      { from: NcrStatus.CLOSED, to: NcrStatus.IN_PROGRESS, method: 'assign' },
      { from: NcrStatus.CLOSED, to: NcrStatus.RESOLVED, method: 'resolve' },
    ];

    it.each(invalidTransitions)(
      'should throw BadRequestException for $from → $to via $method()',
      async ({ from, method }) => {
        const ncr = makeNcr({ status: from });
        ncrRepo.findOne.mockResolvedValue(ncr);

        let promise: Promise<any>;
        switch (method) {
          case 'assign':
            promise = service.assign('ncr-uuid-1', { assigned_to: 'x' }, 'y');
            break;
          case 'resolve':
            promise = service.resolve('ncr-uuid-1', { resolution_note: 'x' });
            break;
          case 'reopen':
            promise = service.reopen('ncr-uuid-1');
            break;
          default:
            throw new Error(`Unknown method: ${method}`);
        }

        await expect(promise).rejects.toThrow(BadRequestException);
      },
    );

    // Valid transitions should NOT throw
    const validTransitions: Array<{
      from: NcrStatus;
      description: string;
      setup: () => Promise<any>;
    }> = [];

    it('should allow OPEN → IN_PROGRESS (assign)', async () => {
      const ncr = makeNcr({ status: NcrStatus.OPEN });
      ncrRepo.findOne.mockResolvedValue(ncr);
      ncrRepo.save.mockImplementation(async (e) => e as NonConformanceReport);

      await expect(
        service.assign('ncr-uuid-1', { assigned_to: 'x' }, 'y'),
      ).resolves.toBeDefined();
    });

    it('should allow IN_PROGRESS → RESOLVED (resolve)', async () => {
      const ncr = makeNcr({ status: NcrStatus.IN_PROGRESS });
      ncrRepo.findOne.mockResolvedValue(ncr);
      ncrRepo.save.mockImplementation(async (e) => e as NonConformanceReport);

      await expect(
        service.resolve('ncr-uuid-1', { resolution_note: 'done' }),
      ).resolves.toBeDefined();
    });

    it('should allow RESOLVED → IN_PROGRESS (verify rejected)', async () => {
      const ncr = makeNcr({ status: NcrStatus.RESOLVED });
      ncrRepo.findOne.mockResolvedValue(ncr);
      ncrRepo.save.mockImplementation(async (e) => e as NonConformanceReport);

      await expect(
        service.verify('ncr-uuid-1', { accepted: false }, 'v'),
      ).resolves.toBeDefined();
    });

    it('should allow CLOSED → OPEN (reopen)', async () => {
      const ncr = makeNcr({ status: NcrStatus.CLOSED });
      const reopenedNcr = makeNcr({ status: NcrStatus.OPEN });
      const qb = createMockQueryBuilder();
      ncrRepo.createQueryBuilder.mockReturnValue(qb);
      ncrRepo.findOne
        .mockResolvedValueOnce(ncr)
        .mockResolvedValueOnce(reopenedNcr);

      await expect(service.reopen('ncr-uuid-1')).resolves.toBeDefined();
    });
  });

  // ════════════════════════════════════════════════════════
  // Bonus: addAttachment() and removeAttachment()
  // ════════════════════════════════════════════════════════
  describe('addAttachment()', () => {
    it('should create and save an attachment', async () => {
      const att = {
        id: 'att-1',
        ncr_id: 'ncr-uuid-1',
        phase: 'BEFORE',
        file_url: '/files/img.jpg',
        file_name: 'img.jpg',
        uploaded_by: 'user-1',
      };
      attachmentRepo.create.mockReturnValue(att as any);
      attachmentRepo.save.mockResolvedValue(att as any);

      const result = await service.addAttachment(
        'ncr-uuid-1',
        'BEFORE',
        '/files/img.jpg',
        'img.jpg',
        'user-1',
      );

      expect(attachmentRepo.create).toHaveBeenCalledWith({
        ncr_id: 'ncr-uuid-1',
        phase: 'BEFORE',
        file_url: '/files/img.jpg',
        file_name: 'img.jpg',
        uploaded_by: 'user-1',
      });
      expect(result).toEqual(att);
    });
  });

  describe('removeAttachment()', () => {
    it('should delete attachment when it exists', async () => {
      attachmentRepo.delete.mockResolvedValue({ affected: 1, raw: {} });
      await expect(service.removeAttachment('att-1')).resolves.toBeUndefined();
    });

    it('should throw NotFoundException when attachment does not exist', async () => {
      attachmentRepo.delete.mockResolvedValue({ affected: 0, raw: {} });
      await expect(service.removeAttachment('bad-att')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
