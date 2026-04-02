import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ProjectPlan, PlanApprovalLog } from './entities/project-plan.entity';
import { PlanNotification } from './entities/plan-notification.entity';
import { CreatePlanDto } from './dto/create-plan.dto';
import { PlanStatus, PLAN_STATUS_TRANSITIONS } from './enums/plan-status.enum';
import { ExcelService } from '../shared/excel';

// ── Helper: kiểm tra frozen ──
function assertNotFrozen(plan: ProjectPlan): void {
  if (plan.frozen_at) {
    throw new ForbiddenException({
      status: 'error',
      message: `Kế hoạch v${plan.version} đã được phê duyệt lúc ${plan.frozen_at.toISOString()} và bị khóa VĨNH VIỄN. Không ai được phép thay đổi, kể cả Admin.`,
      data: null,
    });
  }
}

function assertTransition(current: PlanStatus, target: PlanStatus): void {
  const allowed = PLAN_STATUS_TRANSITIONS[current] ?? [];
  if (!allowed.includes(target)) {
    throw new BadRequestException({
      status: 'error',
      message: `Không thể chuyển từ "${current}" sang "${target}". Cho phép: ${allowed.join(', ') || 'không có'}`,
      data: null,
    });
  }
}

@Injectable()
export class ProjectPlansService {
  constructor(
    @InjectRepository(ProjectPlan)
    private planRepo: Repository<ProjectPlan>,
    @InjectRepository(PlanApprovalLog)
    private logRepo: Repository<PlanApprovalLog>,
    @InjectRepository(PlanNotification)
    private notifRepo: Repository<PlanNotification>,
    private dataSource: DataSource,
    private excelService: ExcelService,
  ) {}

  // ── CRUD ──

  async create(dto: CreatePlanDto, userId: string, userName?: string) {
    // Tính version tiếp theo
    const maxVersion = await this.planRepo
      .createQueryBuilder('p')
      .select('MAX(p.version)', 'max')
      .where('p.project_id = :pid', { pid: dto.project_id })
      .getRawOne();

    const nextVersion = parseInt(maxVersion?.max || '0', 10) + 1;

    const plan = this.planRepo.create({
      project_id: dto.project_id,
      version: nextVersion,
      title: dto.title,
      description: dto.description,
      planned_start: dto.planned_start
        ? new Date(dto.planned_start)
        : undefined,
      planned_end: dto.planned_end ? new Date(dto.planned_end) : undefined,
      total_budget: dto.total_budget,
      plan_data: dto.plan_data,
      attachments: dto.attachments,
      status: PlanStatus.DRAFT,
      created_by: userId,
      created_by_name: userName,
    });

    const saved = await this.planRepo.save(plan);
    return {
      status: 'success',
      message: `Tạo kế hoạch v${nextVersion} thành công`,
      data: saved,
    };
  }

  async findByProject(projectId: string) {
    const plans = await this.planRepo.find({
      where: { project_id: projectId },
      order: { version: 'DESC' },
    });
    return {
      status: 'success',
      message: `Tìm thấy ${plans.length} phiên bản`,
      data: plans,
    };
  }

  async findOne(id: string) {
    const plan = await this.planRepo.findOne({
      where: { id },
      relations: ['approval_logs'],
    });
    if (!plan)
      throw new NotFoundException({
        status: 'error',
        message: 'Kế hoạch không tồn tại!',
        data: null,
      });
    return { status: 'success', message: 'Chi tiết kế hoạch', data: plan };
  }

  async update(id: string, dto: Partial<CreatePlanDto>) {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan)
      throw new NotFoundException({
        status: 'error',
        message: 'Kế hoạch không tồn tại!',
        data: null,
      });

    // IMMUTABLE check — cốt lõi yêu cầu
    assertNotFrozen(plan);

    if (plan.status !== PlanStatus.DRAFT) {
      throw new BadRequestException({
        status: 'error',
        message: 'Chỉ có thể sửa kế hoạch ở trạng thái Soạn thảo (DRAFT)',
        data: null,
      });
    }

    if (dto.title !== undefined) plan.title = dto.title;
    if (dto.description !== undefined) plan.description = dto.description;
    if (dto.planned_start !== undefined)
      plan.planned_start = new Date(dto.planned_start);
    if (dto.planned_end !== undefined)
      plan.planned_end = new Date(dto.planned_end);
    if (dto.total_budget !== undefined) plan.total_budget = dto.total_budget;
    if (dto.plan_data !== undefined) plan.plan_data = dto.plan_data;
    if (dto.attachments !== undefined) plan.attachments = dto.attachments;

    const saved = await this.planRepo.save(plan);
    return {
      status: 'success',
      message: 'Cập nhật kế hoạch thành công',
      data: saved,
    };
  }

  // ══════════════════════════════════════════
  // WORKFLOW: submitPlan → reviewPlan → approvePlan / rejectPlan
  // ══════════════════════════════════════════

  /**
   * submitPlan(): Khóa dữ liệu, chuyển quyền cho cấp trên.
   * DRAFT → SUBMITTED
   */
  async submitPlan(
    id: string,
    userId: string,
    userName?: string,
    comment?: string,
  ) {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan)
      throw new NotFoundException({
        status: 'error',
        message: 'Kế hoạch không tồn tại!',
        data: null,
      });

    assertNotFrozen(plan);
    assertTransition(plan.status, PlanStatus.SUBMITTED);

    return this.dataSource.transaction(async (manager) => {
      const fromStatus = plan.status;
      plan.status = PlanStatus.SUBMITTED;
      plan.submitted_by = userId;
      plan.submitted_by_name = userName ?? '';
      await manager.save(ProjectPlan, plan);

      // Log
      await manager.save(
        PlanApprovalLog,
        this.logRepo.create({
          plan_id: id,
          from_status: fromStatus,
          to_status: plan.status,
          action: 'SUBMIT',
          acted_by: userId,
          acted_by_name: userName,
          actor_role: 'STAFF',
          comment,
        }),
      );

      // Notification → GĐDA (PM) — lấy từ project.manager_id
      await this.createNotification(
        manager,
        plan,
        'PLAN_SUBMITTED',
        `Kế hoạch v${plan.version} "${plan.title}" cần xem xét`,
        `Nhân viên ${userName ?? userId} đã trình kế hoạch thi công cần bạn xem xét và phê duyệt.`,
      );

      return {
        status: 'success',
        message: 'Đã trình kế hoạch — chờ xem xét',
        data: plan,
      };
    });
  }

  /**
   * reviewPlan(): PM xác nhận đã xem xét.
   * SUBMITTED → REVIEWED
   */
  async reviewPlan(
    id: string,
    userId: string,
    userName?: string,
    comment?: string,
  ) {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan)
      throw new NotFoundException({
        status: 'error',
        message: 'Kế hoạch không tồn tại!',
        data: null,
      });

    assertNotFrozen(plan);
    assertTransition(plan.status, PlanStatus.REVIEWED);

    return this.dataSource.transaction(async (manager) => {
      const fromStatus = plan.status;
      plan.status = PlanStatus.REVIEWED;
      plan.reviewed_by = userId;
      plan.reviewed_by_name = userName ?? '';
      await manager.save(ProjectPlan, plan);

      await manager.save(
        PlanApprovalLog,
        this.logRepo.create({
          plan_id: id,
          from_status: fromStatus,
          to_status: plan.status,
          action: 'REVIEW',
          acted_by: userId,
          acted_by_name: userName,
          actor_role: 'PROJECT_MANAGER',
          comment,
        }),
      );

      return {
        status: 'success',
        message: 'Đã xem xét — chờ phê duyệt cuối cùng',
        data: plan,
      };
    });
  }

  /**
   * approvePlan(): Phê duyệt cuối cùng. Đánh dấu Baseline + Freeze vĩnh viễn.
   * REVIEWED → APPROVED
   */
  async approvePlan(
    id: string,
    userId: string,
    userName?: string,
    comment?: string,
  ) {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan)
      throw new NotFoundException({
        status: 'error',
        message: 'Kế hoạch không tồn tại!',
        data: null,
      });

    assertNotFrozen(plan);
    assertTransition(plan.status, PlanStatus.APPROVED);

    return this.dataSource.transaction(async (manager) => {
      const fromStatus = plan.status;

      // Bỏ baseline cũ (nếu có) của cùng project
      await manager
        .createQueryBuilder()
        .update(ProjectPlan)
        .set({ is_baseline: false })
        .where('project_id = :pid AND is_baseline = true', {
          pid: plan.project_id,
        })
        .execute();

      // Set baseline + freeze
      plan.status = PlanStatus.APPROVED;
      plan.is_baseline = true;
      plan.frozen_at = new Date(); // ← IMMUTABLE từ thời điểm này
      plan.approved_by = userId;
      plan.approved_by_name = userName ?? '';
      await manager.save(ProjectPlan, plan);

      // Log
      await manager.save(
        PlanApprovalLog,
        this.logRepo.create({
          plan_id: id,
          from_status: fromStatus,
          to_status: plan.status,
          action: 'APPROVE',
          acted_by: userId,
          acted_by_name: userName,
          actor_role: 'DIRECTOR',
          comment,
        }),
      );

      // Notification → người tạo
      await this.createNotification(
        manager,
        plan,
        'PLAN_APPROVED',
        `Kế hoạch v${plan.version} "${plan.title}" đã được phê duyệt`,
        `Kế hoạch đã trở thành Baseline chính thức. Mọi dữ liệu đã bị khóa vĩnh viễn.`,
      );

      return {
        status: 'success',
        message: `Kế hoạch v${plan.version} đã được phê duyệt và trở thành BASELINE. Dữ liệu bị khóa vĩnh viễn.`,
        data: plan,
      };
    });
  }

  /**
   * rejectPlan(): Từ chối + Tự động clone sang phiên bản mới (version++).
   * SUBMITTED/REVIEWED → REJECTED, then auto-create DRAFT v(n+1)
   */
  async rejectPlan(
    id: string,
    userId: string,
    userName?: string,
    comment?: string,
  ) {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan)
      throw new NotFoundException({
        status: 'error',
        message: 'Kế hoạch không tồn tại!',
        data: null,
      });

    assertNotFrozen(plan);

    if (
      plan.status !== PlanStatus.SUBMITTED &&
      plan.status !== PlanStatus.REVIEWED
    ) {
      throw new BadRequestException({
        status: 'error',
        message: `Chỉ có thể từ chối kế hoạch đang ở SUBMITTED hoặc REVIEWED`,
        data: null,
      });
    }

    return this.dataSource.transaction(async (manager) => {
      const fromStatus = plan.status;

      // Mark rejected
      plan.status = PlanStatus.REJECTED;
      plan.rejection_reason = comment || 'Không đạt yêu cầu';
      await manager.save(ProjectPlan, plan);

      // Log rejection
      await manager.save(
        PlanApprovalLog,
        this.logRepo.create({
          plan_id: id,
          from_status: fromStatus,
          to_status: plan.status,
          action: 'REJECT',
          acted_by: userId,
          acted_by_name: userName,
          actor_role:
            fromStatus === PlanStatus.SUBMITTED
              ? 'PROJECT_MANAGER'
              : 'DIRECTOR',
          comment,
        }),
      );

      // ── Auto-clone sang phiên bản mới version++ ──
      const nextVersion = plan.version + 1;
      const cloned = manager.create(ProjectPlan, {
        project_id: plan.project_id,
        version: nextVersion,
        title: plan.title,
        description: plan.description,
        planned_start: plan.planned_start,
        planned_end: plan.planned_end,
        total_budget: plan.total_budget,
        plan_data: plan.plan_data ? { ...plan.plan_data } : null,
        attachments: plan.attachments ? [...plan.attachments] : null,
        status: PlanStatus.DRAFT,
        created_by: plan.created_by,
        created_by_name: plan.created_by_name,
        previous_version_id: plan.id,
      });
      const savedClone = await manager.save(ProjectPlan, cloned);

      // Log clone
      await manager.save(
        PlanApprovalLog,
        this.logRepo.create({
          plan_id: savedClone.id,
          from_status: 'NONE',
          to_status: PlanStatus.DRAFT,
          action: 'CLONE',
          acted_by: 'SYSTEM',
          acted_by_name: 'Hệ thống',
          actor_role: 'SYSTEM',
          comment: `Tự động tạo v${nextVersion} từ v${plan.version} bị từ chối`,
        }),
      );

      // Notification → người tạo
      await this.createNotification(
        manager,
        plan,
        'PLAN_REJECTED',
        `Kế hoạch v${plan.version} bị từ chối — v${nextVersion} đã được tạo để sửa`,
        `Lý do: ${comment || 'Không đạt yêu cầu'}. Phiên bản mới v${nextVersion} đã sẵn sàng để chỉnh sửa.`,
      );

      return {
        status: 'success',
        message: `Đã từ chối v${plan.version}. Phiên bản v${nextVersion} (DRAFT) đã được tạo tự động để sửa lại.`,
        data: { rejected: plan, new_draft: savedClone },
      };
    });
  }

  // ── NOTIFICATIONS ──

  async findNotifications(userId: string) {
    const notifications = await this.notifRepo.find({
      where: { recipient_id: userId },
      order: { created_at: 'DESC' },
      take: 50,
    });
    return { status: 'success', data: notifications };
  }

  async markNotificationRead(notifId: string) {
    await this.notifRepo.update(notifId, { is_read: true });
    return { status: 'success', message: 'Đã đánh dấu đã đọc' };
  }

  private async createNotification(
    manager: any,
    plan: ProjectPlan,
    type: string,
    title: string,
    message: string,
  ): Promise<void> {
    // Gửi cho người tạo kế hoạch (và PM nếu khác người tạo)
    const recipients = new Set<string>([plan.created_by]);

    await manager.save(
      PlanNotification,
      [...recipients].map((rid) =>
        this.notifRepo.create({
          plan_id: plan.id,
          project_id: plan.project_id,
          recipient_id: rid,
          notification_type: type,
          title,
          message,
        }),
      ),
    );
  }

  // ── EXPORT EXCEL (Bản kế hoạch đã duyệt) ──

  async exportPlanToExcel(id: string): Promise<Buffer> {
    const result = await this.findOne(id);
    const plan = result.data;

    const detailColumns = [
      { header: 'Nội dung', key: 'field', width: 30 },
      { header: 'Chi tiết', key: 'value', width: 55 },
    ];

    const fmtDate = (d: Date | string | null) =>
      d ? new Date(d).toLocaleDateString('vi-VN') : '—';
    const fmtVnd = (v: number | null) =>
      v ? Number(v).toLocaleString('vi-VN') + ' ₫' : '—';

    const data: Record<string, unknown>[] = [
      {
        field: 'Phiên bản',
        value: `v${plan.version}${plan.is_baseline ? ' (BASELINE)' : ''}`,
      },
      { field: 'Trạng thái', value: plan.status },
      { field: 'Tiêu đề', value: plan.title },
      { field: 'Nội dung', value: plan.description ?? '' },
      { field: 'Ngày bắt đầu KH', value: fmtDate(plan.planned_start) },
      { field: 'Ngày kết thúc KH', value: fmtDate(plan.planned_end) },
      { field: 'Tổng ngân sách', value: fmtVnd(plan.total_budget) },
      { field: 'Người tạo', value: plan.created_by_name ?? plan.created_by },
      { field: 'Người trình', value: plan.submitted_by_name ?? '—' },
      { field: 'Người xem xét', value: plan.reviewed_by_name ?? '—' },
      { field: 'Người phê duyệt', value: plan.approved_by_name ?? '—' },
      {
        field: 'Ngày phê duyệt',
        value: plan.frozen_at ? fmtDate(plan.frozen_at) : '—',
      },
      { field: '', value: '' },
      { field: 'LỊCH SỬ PHÊ DUYỆT', value: '' },
      ...(plan.approval_logs ?? []).map((log) => ({
        field: `${log.action} — ${log.actor_role ?? ''}`,
        value: `${log.acted_by_name ?? log.acted_by} | ${fmtDate(log.acted_at)}${log.comment ? ` | ${log.comment}` : ''}`,
      })),
    ];

    // Thêm plan_data nếu có
    if (plan.plan_data && Object.keys(plan.plan_data).length > 0) {
      data.push({ field: '', value: '' });
      data.push({ field: 'DỮ LIỆU KẾ HOẠCH CHI TIẾT', value: '' });
      for (const [key, val] of Object.entries(plan.plan_data)) {
        data.push({
          field: key,
          value:
            typeof val === 'object' ? JSON.stringify(val) : String(val ?? ''),
        });
      }
    }

    return this.excelService.exportToExcel({
      sheetName: `KH v${plan.version}`,
      columns: detailColumns,
      data,
      title: `KẾ HOẠCH THI CÔNG — v${plan.version}${plan.is_baseline ? ' (BASELINE)' : ''}`,
    });
  }
}
