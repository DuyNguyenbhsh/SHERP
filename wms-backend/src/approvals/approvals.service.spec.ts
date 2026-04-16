import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

import { ApprovalsService } from './approvals.service';
import { ApprovalConfig } from './entities/approval-config.entity';
import { ApprovalConfigStep } from './entities/approval-config-step.entity';
import { ApprovalRequest } from './entities/approval-request.entity';
import { ApprovalStep } from './entities/approval-step.entity';
import { Role } from '../users/entities/role.entity';
import { ExcelService } from '../shared/excel';
import {
  ApprovalRequestStatus,
  ApprovalStepStatus,
} from './enums/approval.enum';

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  save: jest.fn((x) => ({ id: 'uuid', ...x })),
  create: jest.fn((x) => x),
  count: jest.fn().mockResolvedValue(0),
  delete: jest.fn().mockResolvedValue({ affected: 1 }),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(0),
    getMany: jest.fn().mockResolvedValue([]),
    getRawMany: jest.fn().mockResolvedValue([]),
  })),
});

describe('ApprovalsService', () => {
  let service: ApprovalsService;
  let configRepo: ReturnType<typeof mockRepo>;
  let configStepRepo: ReturnType<typeof mockRepo>;
  let requestRepo: ReturnType<typeof mockRepo>;
  let stepRepo: ReturnType<typeof mockRepo>;
  let roleRepo: ReturnType<typeof mockRepo>;
  let dataSource: { transaction: jest.Mock; query: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();
    const configRepoMock = mockRepo();
    const configStepRepoMock = mockRepo();
    const requestRepoMock = mockRepo();
    const stepRepoMock = mockRepo();
    const roleRepoMock = mockRepo();
    // Role validation: default — tất cả role codes đều tồn tại
    roleRepoMock.createQueryBuilder = jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(999),
      getMany: jest.fn().mockResolvedValue([]),
    })) as any;

    dataSource = {
      transaction: jest.fn((cb: (m: unknown) => unknown) => cb({})),
      query: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalsService,
        {
          provide: getRepositoryToken(ApprovalConfig),
          useValue: configRepoMock,
        },
        {
          provide: getRepositoryToken(ApprovalConfigStep),
          useValue: configStepRepoMock,
        },
        {
          provide: getRepositoryToken(ApprovalRequest),
          useValue: requestRepoMock,
        },
        { provide: getRepositoryToken(ApprovalStep), useValue: stepRepoMock },
        { provide: getRepositoryToken(Role), useValue: roleRepoMock },
        { provide: DataSource, useValue: dataSource },
        {
          provide: ExcelService,
          useValue: { exportToBuffer: jest.fn(), importFromBuffer: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ApprovalsService>(ApprovalsService);
    configRepo = configRepoMock;
    configStepRepo = configStepRepoMock;
    requestRepo = requestRepoMock;
    stepRepo = stepRepoMock;
    roleRepo = roleRepoMock;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── createConfig() ──
  describe('createConfig()', () => {
    it('validate role codes — throws BadRequest khi có role không tồn tại', async () => {
      roleRepo.createQueryBuilder = jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0), // không tìm thấy role
        getMany: jest.fn().mockResolvedValue([]),
      })) as any;

      await expect(
        service.createConfig({
          entity_type: 'PO',
          name: 'PO Approval',
          steps: [{ step_order: 1, approver_role: 'MISSING_ROLE' } as any],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('tạo config thành công với steps mapping default values', async () => {
      const result = await service.createConfig({
        entity_type: 'PO',
        name: 'PO Approval Flow',
        steps: [
          { step_order: 1, approver_role: 'MANAGER' },
          { step_order: 2, approver_role: 'DIRECTOR' },
        ],
      } as any);

      expect(result.status).toBe('success');
      expect(configRepo.save).toHaveBeenCalled();
    });
  });

  // ── updateConfig() ──
  describe('updateConfig()', () => {
    it('throws NotFound khi config không tồn tại', async () => {
      configRepo.findOne.mockResolvedValue(null);
      await expect(
        service.updateConfig('missing', {
          entity_type: 'PO',
          name: 'X',
          steps: [],
        } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('chặn update khi config đang ACTIVE', async () => {
      configRepo.findOne.mockResolvedValue({
        id: 'cfg-1',
        is_active: true,
        steps: [],
      });
      await expect(
        service.updateConfig('cfg-1', {
          entity_type: 'PO',
          name: 'X',
          steps: [],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── toggleConfig() / removeConfig() ──
  describe('removeConfig()', () => {
    it('chặn xoá config đang ACTIVE', async () => {
      configRepo.findOne.mockResolvedValue({ id: 'cfg-1', is_active: true });
      await expect(service.removeConfig('cfg-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('xoá thành công khi config tạm dừng', async () => {
      configRepo.findOne.mockResolvedValue({ id: 'cfg-1', is_active: false });
      const result = await service.removeConfig('cfg-1');
      expect(result.status).toBe('success');
      expect(configRepo.delete).toHaveBeenCalledWith('cfg-1');
    });
  });

  // ── submitForApproval() ──
  describe('submitForApproval()', () => {
    it('trả null khi không có config matching entity_type', async () => {
      configRepo.findOne.mockResolvedValue(null);
      const result = await service.submitForApproval('PO', 'po-1', 'u1', {});
      expect(result).toBeNull();
    });

    it('tạo request với current_step = step đầu tiên (sorted)', async () => {
      configRepo.findOne.mockResolvedValue({
        id: 'cfg-1',
        steps: [
          { step_order: 2, approver_role: 'DIRECTOR' },
          { step_order: 1, approver_role: 'MANAGER' },
        ],
        conditions: null,
      });
      requestRepo.save.mockImplementation(async (x) => ({ id: 'req-1', ...x }));

      const result = await service.submitForApproval('PO', 'po-1', 'u1', {});
      expect((result as any).status).toBe('success');
      expect(requestRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          current_step: 1,
          status: ApprovalRequestStatus.PENDING,
        }),
      );
    });

    it('threshold skip_to_step=999 → trả null (auto-approved dưới ngưỡng)', async () => {
      configRepo.findOne.mockResolvedValue({
        id: 'cfg-1',
        steps: [{ step_order: 1, approver_role: 'MANAGER' }],
        conditions: {
          threshold_rules: [{ max_amount: 1000, skip_to_step: 999 }],
        },
      });

      const result = await service.submitForApproval(
        'PO',
        'po-1',
        'u1',
        {},
        500,
      );
      expect(result).toBeNull();
    });
  });

  // ── approveStep() / rejectStep() ──
  describe('processStep (qua approveStep/rejectStep)', () => {
    it('throws NotFound khi step không tồn tại', async () => {
      stepRepo.findOne.mockResolvedValue(null);
      await expect(service.approveStep('missing', 'u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('chặn khi step đã xử lý (không còn PENDING)', async () => {
      stepRepo.findOne.mockResolvedValue({
        id: 'step-1',
        status: ApprovalStepStatus.APPROVED,
        request: { id: 'req-1', current_step: 1, config_id: 'cfg-1' },
      });
      await expect(service.approveStep('step-1', 'u1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('chặn duyệt vượt cấp (step_order != request.current_step)', async () => {
      stepRepo.findOne.mockResolvedValue({
        id: 'step-2',
        step_order: 2,
        status: ApprovalStepStatus.PENDING,
        request: { id: 'req-1', current_step: 1, config_id: 'cfg-1' },
      });
      await expect(service.approveStep('step-2', 'u1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('chặn khi user không có quyền (không phải approver/delegate/super-admin)', async () => {
      stepRepo.findOne.mockResolvedValue({
        id: 'step-1',
        step_order: 1,
        approver_id: 'APPROVER_A',
        status: ApprovalStepStatus.PENDING,
        request: { id: 'req-1', current_step: 1, config_id: 'cfg-1' },
      });
      configStepRepo.findOne.mockResolvedValue({ delegate_to_id: null });
      dataSource.query.mockResolvedValue([]); // không phải super admin

      await expect(service.approveStep('step-1', 'user-X')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rejectStep đặt request.status = REJECTED', async () => {
      const request = {
        id: 'req-1',
        current_step: 1,
        config_id: 'cfg-1',
        status: ApprovalRequestStatus.PENDING,
      };
      stepRepo.findOne.mockResolvedValue({
        id: 'step-1',
        step_order: 1,
        approver_id: 'u1',
        status: ApprovalStepStatus.PENDING,
        request,
      });
      configStepRepo.findOne.mockResolvedValue({
        delegate_to_id: null,
        approver_id: 'u1',
      });

      await service.rejectStep('step-1', 'u1', 'User', 'Không đủ tài liệu');

      expect(request.status).toBe(ApprovalRequestStatus.REJECTED);
      expect(requestRepo.save).toHaveBeenCalledWith(request);
    });

    it('approveStep advance sang step tiếp theo khi đủ required_count', async () => {
      const request = {
        id: 'req-1',
        current_step: 1,
        config_id: 'cfg-1',
        status: ApprovalRequestStatus.PENDING,
      };
      stepRepo.findOne.mockResolvedValue({
        id: 'step-1',
        step_order: 1,
        approver_id: 'u1',
        status: ApprovalStepStatus.PENDING,
        request,
      });
      configStepRepo.findOne
        .mockResolvedValueOnce({
          delegate_to_id: null,
          approver_id: 'u1',
          required_count: 1,
        })
        .mockResolvedValueOnce({ is_mandatory: true });

      stepRepo.find
        .mockResolvedValueOnce([
          {
            id: 'step-1',
            step_order: 1,
            status: ApprovalStepStatus.APPROVED,
          },
        ])
        .mockResolvedValueOnce([
          { id: 'step-1', step_order: 1, status: ApprovalStepStatus.APPROVED },
          { id: 'step-2', step_order: 2, status: ApprovalStepStatus.PENDING },
        ]);

      await service.approveStep('step-1', 'u1');

      expect(request.current_step).toBe(2);
      expect(request.status).toBe(ApprovalRequestStatus.IN_PROGRESS);
    });

    it('approveStep FINAL_APPROVED khi không còn step PENDING', async () => {
      const request = {
        id: 'req-1',
        current_step: 1,
        config_id: 'cfg-1',
        status: ApprovalRequestStatus.PENDING,
      };
      stepRepo.findOne.mockResolvedValue({
        id: 'step-1',
        step_order: 1,
        approver_id: 'u1',
        status: ApprovalStepStatus.PENDING,
        request,
      });
      configStepRepo.findOne.mockResolvedValue({
        delegate_to_id: null,
        approver_id: 'u1',
        required_count: 1,
      });
      stepRepo.find
        .mockResolvedValueOnce([
          { id: 'step-1', step_order: 1, status: ApprovalStepStatus.APPROVED },
        ])
        .mockResolvedValueOnce([
          { id: 'step-1', step_order: 1, status: ApprovalStepStatus.APPROVED },
        ]);

      await service.approveStep('step-1', 'u1');

      expect(request.status).toBe(ApprovalRequestStatus.APPROVED);
    });
  });
});
