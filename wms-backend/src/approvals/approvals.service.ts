import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ApprovalConfig } from './entities/approval-config.entity';
import { ApprovalConfigStep } from './entities/approval-config-step.entity';
import { ApprovalRequest } from './entities/approval-request.entity';
import { ApprovalStep } from './entities/approval-step.entity';
import {
  ApprovalRequestStatus,
  ApprovalStepStatus,
} from './enums/approval.enum';
import { CreateApprovalConfigDto } from './dto/create-approval-config.dto';
import type { ApprovalStep as ApprovalStepType } from './entities/approval-step.entity';
import { Role } from '../users/entities/role.entity';
import { ExcelService, type ExcelColumnDef } from '../shared/excel';

interface ThresholdRule {
  max_amount: number | null;
  max_step?: number;
  skip_to_step?: number;
}

@Injectable()
export class ApprovalsService {
  constructor(
    @InjectRepository(ApprovalConfig)
    private configRepo: Repository<ApprovalConfig>,
    @InjectRepository(ApprovalConfigStep)
    private configStepRepo: Repository<ApprovalConfigStep>,
    @InjectRepository(ApprovalRequest)
    private requestRepo: Repository<ApprovalRequest>,
    @InjectRepository(ApprovalStep)
    private stepRepo: Repository<ApprovalStep>,
    @InjectRepository(Role)
    private roleRepo: Repository<Role>,
    private dataSource: DataSource,
    private excelService: ExcelService,
  ) {}

  private readonly CONFIG_COLUMNS: ExcelColumnDef[] = [
    { header: 'Ten quy trinh', key: 'name', width: 30, type: 'string' },
    { header: 'Mo ta', key: 'description', width: 35, type: 'string' },
    { header: 'Module', key: 'module_code', width: 15, type: 'string' },
    { header: 'Loai doi tuong', key: 'entity_type', width: 22, type: 'string' },
    { header: 'Trang thai', key: 'status', width: 14, type: 'string' },
    { header: 'Buoc', key: 'step_order', width: 8, type: 'number' },
    {
      header: 'Vai tro duyet',
      key: 'approver_role',
      width: 18,
      type: 'string',
    },
    { header: 'Bat buoc', key: 'is_mandatory', width: 12, type: 'string' },
    { header: 'So nguoi', key: 'required_count', width: 10, type: 'number' },
    {
      header: 'Timeout (gio)',
      key: 'timeout_hours',
      width: 14,
      type: 'number',
    },
    {
      header: 'Cap pho',
      key: 'alternative_approver_id',
      width: 18,
      type: 'string',
    },
    { header: 'Nguong thap', key: 'threshold_low', width: 16, type: 'number' },
    { header: 'Nguong cao', key: 'threshold_high', width: 16, type: 'number' },
  ];

  /** Validate that all approver_role codes exist in roles table */
  private async validateRoles(
    steps: { approver_role?: string }[],
  ): Promise<void> {
    const roleCodes = steps
      .filter((s) => s.approver_role)
      .map((s) => s.approver_role!);
    if (roleCodes.length === 0) return;
    const uniqueCodes = [...new Set(roleCodes)];
    const found = await this.roleRepo
      .createQueryBuilder('r')
      .where('r.role_code IN (:...codes)', { codes: uniqueCodes })
      .getCount();
    if (found < uniqueCodes.length) {
      const existing = await this.roleRepo
        .createQueryBuilder('r')
        .select('r.role_code')
        .where('r.role_code IN (:...codes)', { codes: uniqueCodes })
        .getMany();
      const existingSet = new Set(existing.map((r) => r.role_code));
      const missing = uniqueCodes.filter((c) => !existingSet.has(c));
      throw new BadRequestException({
        status: 'error',
        message: `Vai tro khong ton tai trong he thong: ${missing.join(', ')}`,
        data: { missing_roles: missing },
      });
    }
  }

  // ══════════════════════════════════════════════════
  //  CONFIG CRUD
  // ══════════════════════════════════════════════════

  async createConfig(dto: CreateApprovalConfigDto, actorName?: string) {
    await this.validateRoles(dto.steps);

    const config = this.configRepo.create({
      entity_type: dto.entity_type,
      name: dto.name,
      description: dto.description,
      module_code: dto.module_code,
      organization_id: dto.organization_id,
      conditions: dto.conditions,
      steps: dto.steps.map((s) => ({
        step_order: s.step_order,
        approver_role: s.approver_role,
        approver_id: s.approver_id,
        is_required: s.is_required ?? true,
        is_mandatory: s.is_mandatory ?? true,
        required_count: s.required_count ?? 1,
        delegate_to_id: s.delegate_to_id,
        alternative_approver_id: s.alternative_approver_id ?? null,
        timeout_hours: s.timeout_hours,
      })),
    });
    const saved = await this.configRepo.save(config);

    // Audit log
    await this.logConfigChange('CREATE', saved.id, saved.name, actorName);

    return {
      status: 'success',
      message: 'Tao cau hinh phe duyet thanh cong',
      data: saved,
    };
  }

  async updateConfig(
    id: string,
    dto: CreateApprovalConfigDto,
    actorName?: string,
  ) {
    await this.validateRoles(dto.steps);

    const config = await this.configRepo.findOne({
      where: { id },
      relations: ['steps'],
    });
    if (!config)
      throw new NotFoundException({
        status: 'error',
        message: 'Cau hinh khong ton tai!',
        data: null,
      });

    if (config.is_active) {
      throw new BadRequestException({
        status: 'error',
        message:
          'Khong the chinh sua cau hinh dang Hoat dong. Vui long chuyen sang Tam dung truoc.',
        data: null,
      });
    }

    await this.configStepRepo.delete({ config_id: id });

    config.entity_type = dto.entity_type;
    config.name = dto.name;
    config.description = dto.description ?? config.description;
    config.module_code = dto.module_code ?? config.module_code;
    config.organization_id = dto.organization_id ?? config.organization_id;
    config.conditions = dto.conditions ?? config.conditions;
    config.steps = dto.steps.map((s) =>
      this.configStepRepo.create({
        config_id: id,
        step_order: s.step_order,
        approver_role: s.approver_role,
        approver_id: s.approver_id,
        is_required: s.is_required ?? true,
        is_mandatory: s.is_mandatory ?? true,
        required_count: s.required_count ?? 1,
        delegate_to_id: s.delegate_to_id,
        alternative_approver_id: s.alternative_approver_id ?? null,
        timeout_hours: s.timeout_hours,
      }),
    );

    const saved = await this.configRepo.save(config);
    await this.logConfigChange('UPDATE', saved.id, saved.name, actorName);
    return {
      status: 'success',
      message: 'Cap nhat cau hinh thanh cong',
      data: saved,
    };
  }

  async findConfigs() {
    const configs = await this.configRepo.find({
      relations: ['steps'],
      order: { created_at: 'DESC' },
    });
    return {
      status: 'success',
      message: `Tim thay ${configs.length} cau hinh`,
      data: configs,
    };
  }

  async findConfigById(id: string) {
    const config = await this.configRepo.findOne({
      where: { id },
      relations: ['steps'],
    });
    if (!config)
      throw new NotFoundException({
        status: 'error',
        message: 'Cau hinh khong ton tai!',
        data: null,
      });
    return { status: 'success', data: config };
  }

  async toggleConfig(id: string) {
    const config = await this.configRepo.findOne({ where: { id } });
    if (!config)
      throw new NotFoundException({
        status: 'error',
        message: 'Cau hinh khong ton tai!',
        data: null,
      });
    config.is_active = !config.is_active;
    await this.configRepo.save(config);
    return {
      status: 'success',
      message: config.is_active ? 'Da kich hoat' : 'Da tam dung',
      data: config,
    };
  }

  async removeConfig(id: string) {
    const config = await this.configRepo.findOne({ where: { id } });
    if (!config)
      throw new NotFoundException({
        status: 'error',
        message: 'Cau hinh khong ton tai!',
        data: null,
      });

    if (config.is_active) {
      throw new BadRequestException({
        status: 'error',
        message:
          'Khong the xoa cau hinh dang Hoat dong. Vui long chuyen sang Tam dung truoc.',
        data: null,
      });
    }

    await this.configRepo.delete(id);
    return {
      status: 'success',
      message: 'Xoa cau hinh thanh cong',
      data: null,
    };
  }

  // ══════════════════════════════════════════════════
  //  THRESHOLD — Tinh so buoc can duyet dua tren so tien
  // ══════════════════════════════════════════════════

  private resolveStepsForAmount(
    configSteps: ApprovalConfigStep[],
    amount?: number,
    conditions?: Record<string, unknown>,
  ): ApprovalConfigStep[] {
    if (!amount || !conditions) return configSteps;

    const rules = conditions['threshold_rules'] as ThresholdRule[] | undefined;
    if (!rules || !Array.isArray(rules)) return configSteps;

    // Tim rule phu hop (first match)
    for (const rule of rules) {
      if (rule.max_amount === null || amount <= rule.max_amount) {
        if (rule.skip_to_step === 999) {
          // Duoi nguong → khong can duyet
          return [];
        }
        if (rule.max_step !== undefined) {
          return configSteps.filter((s) => s.step_order <= rule.max_step!);
        }
        break;
      }
    }

    return configSteps;
  }

  // ══════════════════════════════════════════════════
  //  SUBMIT — Gui yeu cau phe duyet
  // ══════════════════════════════════════════════════

  async submitForApproval(
    entityType: string,
    entityId: string,
    requestedBy: string,
    requestData: Record<string, unknown>,
    amount?: number,
  ) {
    // Tim config phu hop
    const config = await this.configRepo.findOne({
      where: { entity_type: entityType, is_active: true },
      relations: ['steps'],
    });

    if (!config) return null; // Khong co config → khong can phe duyet

    // Ap dung threshold
    const sortedSteps = [...config.steps].sort(
      (a, b) => a.step_order - b.step_order,
    );
    const filteredSteps = this.resolveStepsForAmount(
      sortedSteps,
      amount,
      config.conditions,
    );

    if (filteredSteps.length === 0) return null; // Duoi nguong → tu dong duyet

    // Tao request + instance steps
    const request = this.requestRepo.create({
      config_id: config.id,
      entity_type: entityType,
      entity_id: entityId,
      requested_by: requestedBy,
      request_data: { ...requestData, amount },
      current_step: filteredSteps[0].step_order,
      status: ApprovalRequestStatus.PENDING,
      steps: filteredSteps.map(
        (cs) =>
          ({
            step_order: cs.step_order,
            approver_id: cs.approver_id || cs.approver_role || 'UNASSIGNED',
            role_code: cs.approver_role ?? null,
            approver_name: null,
            delegated_from_id: null,
            status: ApprovalStepStatus.PENDING,
          }) as Partial<ApprovalStepType>,
      ),
    });

    const saved = await this.requestRepo.save(request);
    return {
      status: 'success',
      message: 'Da gui yeu cau phe duyet',
      data: saved,
    };
  }

  // ══════════════════════════════════════════════════
  //  GET NEXT APPROVER — Ai la nguoi duyet tiep theo?
  // ══════════════════════════════════════════════════

  async getNextApprover(requestId: string) {
    const request = await this.requestRepo.findOne({
      where: { id: requestId },
      relations: ['steps'],
    });
    if (!request)
      throw new NotFoundException({
        status: 'error',
        message: 'Yeu cau khong ton tai!',
        data: null,
      });

    if (
      request.status === ApprovalRequestStatus.APPROVED ||
      request.status === ApprovalRequestStatus.REJECTED
    ) {
      return { status: 'success', message: 'Yeu cau da hoan tat', data: null };
    }

    const currentSteps = request.steps.filter(
      (s) =>
        s.step_order === request.current_step &&
        s.status === ApprovalStepStatus.PENDING,
    );

    if (currentSteps.length === 0) {
      return {
        status: 'success',
        message: 'Khong co buoc nao dang cho',
        data: null,
      };
    }

    // Lay thong tin config step de kiem tra delegation
    const configStep = await this.configStepRepo.findOne({
      where: { config_id: request.config_id, step_order: request.current_step },
    });

    const approvers = currentSteps.map((s) => ({
      stepId: s.id,
      approverId: s.approver_id,
      approverName: s.approver_name,
      roleCode: s.role_code,
      delegateToId: configStep?.delegate_to_id || null,
    }));

    return {
      status: 'success',
      message: `Buoc ${request.current_step}: ${approvers.length} nguoi can duyet`,
      data: {
        currentStep: request.current_step,
        requiredCount: configStep?.required_count || 1,
        approvers,
      },
    };
  }

  // ══════════════════════════════════════════════════
  //  PROCESS APPROVAL — Phe duyet / Tu choi
  // ══════════════════════════════════════════════════

  async approveStep(
    stepId: string,
    userId: string,
    userName?: string,
    comment?: string,
  ) {
    return this.processStep(
      stepId,
      userId,
      userName,
      ApprovalStepStatus.APPROVED,
      comment,
    );
  }

  async rejectStep(
    stepId: string,
    userId: string,
    userName?: string,
    comment?: string,
  ) {
    return this.processStep(
      stepId,
      userId,
      userName,
      ApprovalStepStatus.REJECTED,
      comment,
    );
  }

  private async processStep(
    stepId: string,
    userId: string,
    userName: string | undefined,
    action: ApprovalStepStatus,
    comment?: string,
  ) {
    const step = await this.stepRepo.findOne({
      where: { id: stepId },
      relations: ['request'],
    });
    if (!step)
      throw new NotFoundException({
        status: 'error',
        message: 'Buoc phe duyet khong ton tai!',
        data: null,
      });
    if (step.status !== ApprovalStepStatus.PENDING) {
      throw new BadRequestException({
        status: 'error',
        message: 'Buoc phe duyet da duoc xu ly!',
        data: null,
      });
    }

    const request = step.request;

    // ── SKIP-LEVEL GUARD: Cam vuot cap ──
    if (step.step_order !== request.current_step) {
      throw new ForbiddenException({
        status: 'error',
        message: `Khong the duyet vuot cap! Buoc hien tai la ${request.current_step}, buoc nay la ${step.step_order}.`,
        data: null,
      });
    }

    // ── AUTHORIZATION: Kiem tra quyen duyet ──
    const configStep = await this.configStepRepo.findOne({
      where: { config_id: request.config_id, step_order: step.step_order },
    });

    const isDirectApprover = step.approver_id === userId;
    const isDelegate = configStep?.delegate_to_id === userId;

    // Kiem tra SUPER_ADMIN bypass: query user roles
    let isSuperAdmin = false;
    if (!isDirectApprover && !isDelegate) {
      const superCheck = await this.dataSource.query(
        `SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = $1 AND r.role_code = 'SUPER_ADMIN' LIMIT 1`,
        [userId],
      );
      isSuperAdmin = superCheck.length > 0;
    }

    if (!isDirectApprover && !isDelegate && !isSuperAdmin) {
      throw new ForbiddenException({
        status: 'error',
        message: 'Ban khong co quyen phe duyet buoc nay!',
        data: null,
      });
    }

    // ── Ghi nhan hanh dong ──
    step.status = action;
    step.approver_id = userId;
    step.approver_name = userName || null;
    step.comment = comment ?? null;
    step.acted_at = new Date();
    if (isDelegate) {
      step.delegated_from_id =
        configStep?.approver_id || configStep?.approver_role || null;
    }
    await this.stepRepo.save(step);

    // ── REJECT → Toan bo request bi reject ──
    if (action === ApprovalStepStatus.REJECTED) {
      request.status = ApprovalRequestStatus.REJECTED;
      request.resolved_at = new Date();
      await this.requestRepo.save(request);
      return {
        status: 'success',
        message: 'Yeu cau da bi tu choi',
        data: request,
      };
    }

    // ── APPROVE → Kiem tra parallel + advance ──
    const allStepsThisOrder = await this.stepRepo.find({
      where: { request_id: request.id, step_order: step.step_order },
    });

    const approvedCount = allStepsThisOrder.filter(
      (s) => s.status === ApprovalStepStatus.APPROVED,
    ).length;

    const requiredCount = configStep?.required_count || 1;

    if (approvedCount < requiredCount) {
      // Can them nguoi duyet o buoc nay (parallel)
      request.status = ApprovalRequestStatus.IN_PROGRESS;
      await this.requestRepo.save(request);
      return {
        status: 'success',
        message: `Da duyet (${approvedCount}/${requiredCount}). Can them ${requiredCount - approvedCount} nguoi duyet nua.`,
        data: request,
      };
    }

    // Du so luong → Tim buoc tiep theo (bo qua buoc khong bat buoc)
    const allSteps = await this.stepRepo.find({
      where: { request_id: request.id },
      order: { step_order: 'ASC' },
    });

    // Auto-skip non-mandatory steps
    for (const s of allSteps) {
      if (
        s.status !== ApprovalStepStatus.PENDING ||
        s.step_order <= step.step_order
      )
        continue;
      const cs = await this.configStepRepo.findOne({
        where: { config_id: request.config_id, step_order: s.step_order },
      });
      if (cs && !cs.is_mandatory) {
        s.status = ApprovalStepStatus.SKIPPED;
        s.comment = 'Tu dong bo qua (khong bat buoc)';
        s.acted_at = new Date();
        await this.stepRepo.save(s);
      } else {
        break; // Dung lai khi gap buoc bat buoc
      }
    }

    const nextPending = allSteps.find(
      (s) =>
        s.status === ApprovalStepStatus.PENDING &&
        s.step_order > step.step_order,
    );

    if (nextPending) {
      request.current_step = nextPending.step_order;
      request.status = ApprovalRequestStatus.IN_PROGRESS;
      await this.requestRepo.save(request);
      return {
        status: 'success',
        message: 'Da phe duyet, chuyen buoc tiep theo',
        data: request,
      };
    }

    // Khong con buoc bat buoc nao → FINAL APPROVED
    request.status = ApprovalRequestStatus.APPROVED;
    request.resolved_at = new Date();
    await this.requestRepo.save(request);
    return {
      status: 'success',
      message: 'Yeu cau da duoc phe duyet hoan tat (FINAL_APPROVED)',
      data: request,
    };
  }

  // ══════════════════════════════════════════════════
  //  QUERIES
  // ══════════════════════════════════════════════════

  async findPendingForUser(userId: string) {
    const pending = await this.stepRepo
      .createQueryBuilder('s')
      .innerJoinAndSelect('s.request', 'r')
      .where('(s.approver_id = :userId)', { userId })
      .andWhere('s.status = :status', { status: ApprovalStepStatus.PENDING })
      .andWhere('r.status IN (:...rStatuses)', {
        rStatuses: [
          ApprovalRequestStatus.PENDING,
          ApprovalRequestStatus.IN_PROGRESS,
        ],
      })
      .andWhere('s.step_order = r.current_step')
      .orderBy('r.created_at', 'ASC')
      .getMany();

    // Cung kiem tra delegation: tim cac step ma user la delegate
    const delegated = await this.stepRepo
      .createQueryBuilder('s')
      .innerJoinAndSelect('s.request', 'r')
      .innerJoin(
        'approval_config_steps',
        'cs',
        'cs.config_id = r.config_id AND cs.step_order = s.step_order',
      )
      .where('cs.delegate_to_id = :userId', { userId })
      .andWhere('s.status = :status', { status: ApprovalStepStatus.PENDING })
      .andWhere('r.status IN (:...rStatuses)', {
        rStatuses: [
          ApprovalRequestStatus.PENDING,
          ApprovalRequestStatus.IN_PROGRESS,
        ],
      })
      .andWhere('s.step_order = r.current_step')
      .getMany();

    // Merge va loai trung
    const allPending = [...pending];
    for (const d of delegated) {
      if (!allPending.find((p) => p.id === d.id)) allPending.push(d);
    }

    return {
      status: 'success',
      message: `${allPending.length} yeu cau cho phe duyet`,
      data: allPending,
    };
  }

  async getRequestStatus(requestId: string) {
    const request = await this.requestRepo.findOne({
      where: { id: requestId },
      relations: ['steps', 'config', 'config.steps'],
    });
    if (!request)
      throw new NotFoundException({
        status: 'error',
        message: 'Yeu cau khong ton tai!',
        data: null,
      });
    return {
      status: 'success',
      message: 'Chi tiet yeu cau phe duyet',
      data: request,
    };
  }

  async findByEntity(entityType: string, entityId: string) {
    const requests = await this.requestRepo.find({
      where: { entity_type: entityType, entity_id: entityId },
      relations: ['steps'],
      order: { created_at: 'DESC' },
    });
    return { status: 'success', data: requests };
  }

  // ══════════════════════════════════════════════════
  //  EXCEL — Export / Template / Import
  // ══════════════════════════════════════════════════

  async exportToExcel(): Promise<Buffer> {
    const configs = await this.configRepo.find({
      relations: ['steps'],
      order: { created_at: 'DESC' },
    });

    const data: Record<string, unknown>[] = [];
    for (const cfg of configs) {
      const rules = cfg.conditions?.['threshold_rules'] as
        | ThresholdRule[]
        | undefined;
      const amounts = (rules || [])
        .filter((r) => r.max_amount !== null)
        .map((r) => r.max_amount);
      const sorted = [...(cfg.steps || [])].sort(
        (a, b) => a.step_order - b.step_order,
      );

      if (sorted.length === 0) {
        data.push({
          name: cfg.name,
          description: cfg.description ?? '',
          module_code: cfg.module_code ?? '',
          entity_type: cfg.entity_type,
          status: cfg.is_active ? 'ACTIVE' : 'INACTIVE',
          step_order: '',
          approver_role: '',
          is_mandatory: '',
          required_count: '',
          timeout_hours: '',
          alternative_approver_id: '',
          threshold_low: amounts[0] ?? '',
          threshold_high: amounts[1] ?? '',
        });
      } else {
        sorted.forEach((step, idx) => {
          data.push({
            name: idx === 0 ? cfg.name : '',
            description: idx === 0 ? (cfg.description ?? '') : '',
            module_code: idx === 0 ? (cfg.module_code ?? '') : '',
            entity_type: idx === 0 ? cfg.entity_type : '',
            status: idx === 0 ? (cfg.is_active ? 'ACTIVE' : 'INACTIVE') : '',
            step_order: step.step_order,
            approver_role: step.approver_role ?? '',
            is_mandatory: step.is_mandatory ? 'YES' : 'NO',
            required_count: step.required_count ?? 1,
            timeout_hours: step.timeout_hours ?? '',
            alternative_approver_id: step.alternative_approver_id ?? '',
            threshold_low: idx === 0 ? (amounts[0] ?? '') : '',
            threshold_high: idx === 0 ? (amounts[1] ?? '') : '',
          });
        });
      }
    }

    return this.excelService.exportToExcel({
      sheetName: 'Quy trinh phe duyet',
      columns: this.CONFIG_COLUMNS,
      data,
      title: `Danh sach Quy trinh phe duyet — Xuat ${new Date().toLocaleDateString('vi-VN')}`,
    });
  }

  async getExcelTemplate(): Promise<Buffer> {
    return this.excelService.exportTemplate({
      sheetName: 'Quy trinh phe duyet',
      columns: this.CONFIG_COLUMNS,
      sampleRow: {
        name: 'Duyet tam ung IMPC',
        description: 'Quy trinh duyet tam ung cho du an IMPC',
        module_code: 'PROJECT',
        entity_type: 'PURCHASE_REQUEST',
        status: 'ACTIVE',
        step_order: 1,
        approver_role: 'MANAGER',
        is_mandatory: 'YES',
        required_count: 1,
        timeout_hours: 72,
        alternative_approver_id: '',
        threshold_low: 5000000,
        threshold_high: 50000000,
      },
    });
  }

  async importFromExcel(fileBuffer: Buffer) {
    // Load valid roles for validation
    const roles = await this.roleRepo.find({ select: ['role_code'] });
    const roleSet = new Set(roles.map((r) => r.role_code));

    const result = await this.excelService.parseExcel(fileBuffer, {
      columns: this.CONFIG_COLUMNS,
      requiredKeys: ['name', 'entity_type'],
      validators: {
        approver_role: {
          validate: (v) => {
            if (!v) return null;
            return !roleSet.has(String(v))
              ? `Vai tro "${v}" khong ton tai`
              : null;
          },
        },
        is_mandatory: {
          validate: (v) => {
            if (!v) return null;
            return !['YES', 'NO'].includes(String(v).toUpperCase())
              ? 'Gia tri phai la YES hoac NO'
              : null;
          },
        },
      },
    });

    if (result.errors.length > 0) {
      return {
        status: 'error',
        message: `Co ${result.errors.length} loi khi doc file`,
        data: {
          total_rows: result.totalRows,
          success_rows: 0,
          error_rows: result.errorRows,
          errors: result.errors,
        },
      };
    }

    // Group rows by config name
    const configGroups = new Map<string, Record<string, unknown>[]>();
    for (const row of result.data) {
      const configName = String(row['name'] || '').trim();
      if (configName) {
        configGroups.set(configName, [row]);
      } else {
        // Step row belongs to previous config
        const lastKey = [...configGroups.keys()].pop();
        if (lastKey) configGroups.get(lastKey)!.push(row);
      }
    }

    let savedCount = 0;
    const persistErrors: { row: number; field: string; message: string }[] = [];

    for (const [configName, rows] of configGroups) {
      try {
        const firstRow = rows[0];
        const entityType = String(firstRow['entity_type'] || 'GENERAL');
        const moduleCode = String(firstRow['module_code'] || '') || undefined;
        const description = String(firstRow['description'] || '') || undefined;
        const thresholdLow = firstRow['threshold_low']
          ? Number(firstRow['threshold_low'])
          : null;
        const thresholdHigh = firstRow['threshold_high']
          ? Number(firstRow['threshold_high'])
          : null;

        const conditions: Record<string, unknown> = {};
        if (thresholdLow !== null && thresholdHigh !== null) {
          conditions['threshold_rules'] = [
            { max_amount: thresholdLow, skip_to_step: 999 },
            { max_amount: thresholdHigh, max_step: 2 },
            { max_amount: null, max_step: 999 },
          ];
        }

        const steps = rows
          .filter((r) => r['approver_role'])
          .map((r, idx) => ({
            step_order: Number(r['step_order']) || idx + 1,
            approver_role: String(r['approver_role']),
            is_required: true,
            is_mandatory:
              String(r['is_mandatory'] || 'YES').toUpperCase() !== 'NO',
            required_count: Number(r['required_count']) || 1,
            alternative_approver_id:
              String(r['alternative_approver_id'] || '') || null,
            timeout_hours: r['timeout_hours']
              ? Number(r['timeout_hours'])
              : undefined,
          }));

        // Upsert: check if config with same name exists
        const existing = await this.configRepo.findOne({
          where: { name: configName },
          relations: ['steps'],
        });

        if (existing) {
          // Must be inactive to update
          if (existing.is_active) {
            persistErrors.push({
              row: 0,
              field: 'name',
              message: `"${configName}" dang Hoat dong, khong the cap nhat. Hay tam dung truoc.`,
            });
            continue;
          }
          await this.configStepRepo.delete({ config_id: existing.id });
          existing.entity_type = entityType;
          existing.module_code = moduleCode ?? existing.module_code;
          existing.description = description ?? existing.description;
          existing.conditions =
            Object.keys(conditions).length > 0
              ? conditions
              : existing.conditions;
          existing.steps = steps.map((s) =>
            this.configStepRepo.create({ config_id: existing.id, ...s }),
          );
          await this.configRepo.save(existing);
        } else {
          const config = this.configRepo.create({
            entity_type: entityType,
            name: configName,
            description,
            module_code: moduleCode,
            conditions:
              Object.keys(conditions).length > 0 ? conditions : undefined,
            steps: steps.map((s) => this.configStepRepo.create(s)),
          });
          await this.configRepo.save(config);
        }
        savedCount++;
      } catch (err: any) {
        persistErrors.push({ row: 0, field: 'general', message: err.message });
      }
    }

    return {
      status: 'success',
      message: `Import: ${savedCount}/${configGroups.size} quy trinh thanh cong`,
      data: {
        total_rows: result.totalRows,
        success_rows: savedCount,
        error_rows: persistErrors.length,
        errors: persistErrors.length > 0 ? persistErrors : undefined,
      },
    };
  }

  // ══════════════════════════════════════════════════
  //  AUDIT LOG — Ghi nhan moi thay doi cau hinh
  // ══════════════════════════════════════════════════

  private async logConfigChange(
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'TOGGLE',
    configId: string,
    configName: string,
    actorName?: string,
  ) {
    try {
      await this.dataSource.query(
        `INSERT INTO audit_logs (id, entity_type, entity_id, action, changes, actor_id, actor_name, created_at)
         VALUES (uuid_generate_v4(), 'APPROVAL_CONFIG', $1, $2, $3, $4, $5, NOW())`,
        [
          configId,
          action,
          JSON.stringify({ config_name: configName, action }),
          actorName || 'SYSTEM',
          actorName || 'SYSTEM',
        ],
      );
    } catch {
      // Audit log failure should not block main operation
    }
  }
}
