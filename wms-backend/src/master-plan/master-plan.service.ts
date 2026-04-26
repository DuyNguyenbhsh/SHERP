import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MasterPlan } from './entities/master-plan.entity';
import { WbsNode } from './entities/wbs-node.entity';
import { TaskTemplate } from './entities/task-template.entity';
import { CreateMasterPlanDto } from './dto/create-master-plan.dto';
import { UpdateMasterPlanDto } from './dto/update-master-plan.dto';
import { CreateWbsNodeDto } from './dto/create-wbs-node.dto';
import { UpdateWbsNodeDto } from './dto/update-wbs-node.dto';
import { CreateTaskTemplateDto } from './dto/create-task-template.dto';
import { MasterPlanStatus, WbsNodeType } from './enums/master-plan.enum';
import { nextOccurrences } from './domain/logic/rrule-parser.logic';
import {
  validateBudgetRollupTree,
  WbsRollupNode,
} from './domain/logic/budget-rollup.logic';
import { RecurrenceProducer } from './queues/recurrence.producer';
import { Project } from '../projects/entities/project.entity';
import { AuditLogService } from '../common/audit/audit-log.service';
import { AuditAction } from '../common/audit/audit-log.entity';

interface CreateMasterPlanUserContext {
  userId?: string;
  contexts?: string[];
}

const BLOCKING_WORK_ITEM_STATUSES = ['NEW', 'IN_PROGRESS'] as const;

@Injectable()
export class MasterPlanService {
  constructor(
    @InjectRepository(MasterPlan)
    private readonly planRepo: Repository<MasterPlan>,
    @InjectRepository(WbsNode) private readonly nodeRepo: Repository<WbsNode>,
    @InjectRepository(TaskTemplate)
    private readonly tplRepo: Repository<TaskTemplate>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly recurrence: RecurrenceProducer,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Headroom ngân sách = project.budget - Σ(active Master Plan budget) của project.
   * Dùng cho soft warning ở bước create (BR-MPL-04, SA_DESIGN §8.3).
   * V1 lấy từ project.budget (ticket backlog BUDGET-HEADROOM-ACCURATE-CALC cho V2).
   */
  private async calculateBudgetHeadroom(projectId: string): Promise<bigint> {
    const project = await this.projectRepo.findOneBy({ id: projectId });
    if (!project) return 0n;
    const raw = await this.planRepo
      .createQueryBuilder('mp')
      .select('COALESCE(SUM(mp.budget_vnd::bigint), 0)', 'sum')
      .where('mp.project_id = :pid', { pid: projectId })
      .andWhere('mp.status != :closed', { closed: MasterPlanStatus.CLOSED })
      .getRawOne<{ sum: string }>();
    const projectBudget = BigInt(
      project.budget !== null && project.budget !== undefined
        ? String(project.budget).split('.')[0]
        : '0',
    );
    return projectBudget - BigInt(raw?.sum ?? '0');
  }

  // ── Master Plan CRUD ─────────────────────────────────────────
  async create(dto: CreateMasterPlanDto, user?: CreateMasterPlanUserContext) {
    const existed = await this.planRepo.findOne({
      where: { project_id: dto.project_id, year: dto.year },
    });
    if (existed) {
      throw new ConflictException(
        `Dự án đã có Master Plan năm ${dto.year} (code ${existed.code})`,
      );
    }

    // Verify project tồn tại (phòng case lookup trả rỗng, FE bypass gửi UUID cũ).
    const project = await this.projectRepo.findOneBy({ id: dto.project_id });
    if (!project) {
      throw new NotFoundException({
        status: 'error',
        message: 'Dự án không còn tồn tại. Vui lòng chọn lại.',
        data: null,
      });
    }

    const saved = await this.planRepo.save(this.planRepo.create(dto));

    // Cross-org audit (SA_DESIGN §7.3). Chỉ log khi user context hợp lệ.
    const actorContexts: string[] = user?.contexts ?? [];
    const crossOrg = project.organization_id
      ? !actorContexts.includes(project.organization_id)
      : false;
    if (crossOrg) {
      await this.auditLogService.log({
        action: AuditAction.CREATE,
        entityName: 'MasterPlan',
        entityId: saved.id,
        reason: 'CREATE_MASTER_PLAN_CROSS_ORG',
        newData: {
          project_id: saved.project_id,
          project_org_id: project.organization_id,
          actor_contexts: actorContexts,
        },
      });
    }

    // Soft budget warning (non-blocking). Hard-block vẫn ở approve() (BR-MP-04).
    const headroom = await this.calculateBudgetHeadroom(saved.project_id);
    const planBudget = BigInt(saved.budget_vnd ?? 0);
    const budgetWarning = planBudget > headroom;

    return {
      message: 'Đã tạo Master Plan.',
      data: saved,
      warning: budgetWarning || undefined,
      headroom: budgetWarning ? headroom.toString() : undefined,
    };
  }

  async findAll() {
    return this.planRepo.find({ order: { year: 'DESC', code: 'ASC' } });
  }

  async findOne(id: string) {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Không tìm thấy Master Plan');
    return plan;
  }

  async update(id: string, dto: UpdateMasterPlanDto) {
    const plan = await this.findOne(id);
    if (plan.status === MasterPlanStatus.CLOSED) {
      throw new BadRequestException('Master Plan đã đóng, không sửa được');
    }
    Object.assign(plan, dto);
    return this.planRepo.save(plan);
  }

  async approve(id: string, approverUserId: string) {
    const plan = await this.findOne(id);
    if (plan.status !== MasterPlanStatus.DRAFT) {
      throw new BadRequestException(
        'Chỉ phê duyệt được Master Plan ở trạng thái DRAFT',
      );
    }

    // BR-MP-04: validate đệ quy toàn cây — Σ(con) ≤ cha ở mọi cấp,
    // và Σ(root) ≤ plan.budget_vnd. Không dùng per-category checkBudgetLimit.
    const nodes = await this.nodeRepo.find({
      where: { plan_id: id, is_archived: false },
      select: ['id', 'parent_id', 'budget_vnd', 'wbs_code'],
    });
    const rollupNodes: WbsRollupNode[] = nodes.map((n) => ({
      id: n.id,
      parent_id: n.parent_id,
      budget_vnd: BigInt(n.budget_vnd || '0'),
      wbs_code: n.wbs_code,
    }));
    const rollup = validateBudgetRollupTree(
      rollupNodes,
      BigInt(plan.budget_vnd || '0'),
    );
    if (!rollup.ok) {
      const summary = rollup.violations
        .map(
          (v) =>
            `[${v.parentCode}] ngân sách ${v.parentBudget} < Σcon ${v.childrenSum} (vượt ${v.excess}đ)`,
        )
        .join('; ');
      throw new BadRequestException(
        `BR-MP-04: Ngân sách WBS vượt cấp cha. ${summary}`,
      );
    }

    plan.status = MasterPlanStatus.ACTIVE;
    plan.approved_by = approverUserId;
    plan.approved_at = new Date();
    return this.planRepo.save(plan);
  }

  async close(id: string) {
    const plan = await this.findOne(id);
    plan.status = MasterPlanStatus.CLOSED;
    return this.planRepo.save(plan);
  }

  // ── WBS Node ─────────────────────────────────────────────────
  async addWbsNode(planId: string, dto: CreateWbsNodeDto) {
    const plan = await this.findOne(planId);
    this.ensurePlanMutable(plan);

    // Validate parent_id (nếu có): phải cùng plan, chưa archive, level+1 khớp
    if (dto.parent_id) {
      const parent = await this.nodeRepo.findOne({
        where: { id: dto.parent_id },
      });
      if (!parent) {
        throw new BadRequestException(
          `parent_id không tồn tại: ${dto.parent_id}`,
        );
      }
      if (parent.plan_id !== planId) {
        throw new BadRequestException(
          'parent_id thuộc Master Plan khác — không thể gắn chéo cây',
        );
      }
      if (parent.is_archived) {
        throw new BadRequestException(
          `Node cha đã archive (${parent.wbs_code}), không thể thêm con`,
        );
      }
      if (dto.level !== parent.level + 1) {
        throw new BadRequestException(
          `level phải = parent.level + 1 (parent level ${parent.level}, yêu cầu ${parent.level + 1}, nhận ${dto.level})`,
        );
      }
    } else {
      // root node → level bắt buộc = 1
      if (dto.level !== 1) {
        throw new BadRequestException(
          'Node gốc (không có parent) bắt buộc level = 1',
        );
      }
    }

    // Validate dates
    this.validateNodeDates(dto.start_date, dto.end_date, plan);

    const dup = await this.nodeRepo.findOne({
      where: { plan_id: planId, wbs_code: dto.wbs_code },
    });
    if (dup)
      throw new ConflictException(`WBS code đã tồn tại: ${dto.wbs_code}`);
    return this.nodeRepo.save(
      this.nodeRepo.create({ plan_id: planId, ...dto }),
    );
  }

  async updateWbsNode(
    planId: string,
    nodeId: string,
    dto: UpdateWbsNodeDto,
    expectedVersion?: number,
  ) {
    const plan = await this.findOne(planId);
    this.ensurePlanMutable(plan);

    const node = await this.nodeRepo.findOne({ where: { id: nodeId } });
    if (!node) throw new NotFoundException('Không tìm thấy WBS node');
    if (node.plan_id !== planId) {
      throw new BadRequestException('WBS node không thuộc plan hiện tại');
    }
    if (node.is_archived) {
      throw new BadRequestException('Node đã archive, không thể sửa');
    }
    if (expectedVersion !== undefined && node.version !== expectedVersion) {
      throw new ConflictException(
        `Xung đột phiên bản: version hiện tại ${node.version}, client gửi ${expectedVersion}`,
      );
    }

    const nextStart = dto.start_date ?? node.start_date;
    const nextEnd = dto.end_date ?? node.end_date;
    this.validateNodeDates(nextStart, nextEnd, plan);

    Object.assign(node, dto);
    return this.nodeRepo.save(node);
  }

  async getWbsTree(planId: string) {
    return this.nodeRepo.find({
      where: { plan_id: planId, is_archived: false },
      order: { level: 'ASC', sort_order: 'ASC', wbs_code: 'ASC' },
    });
  }

  async archiveWbsNode(planId: string, nodeId: string) {
    const plan = await this.findOne(planId);
    this.ensurePlanMutable(plan);

    const node = await this.nodeRepo.findOne({ where: { id: nodeId } });
    if (!node) throw new NotFoundException('Không tìm thấy WBS node');
    if (node.plan_id !== planId) {
      throw new BadRequestException('WBS node không thuộc plan hiện tại');
    }
    if (node.is_archived) {
      return node;
    }

    // Lấy toàn bộ id con cháu qua recursive CTE
    const descendantRows = await this.nodeRepo.manager.query<
      Array<{ id: string }>
    >(
      `WITH RECURSIVE tree AS (
         SELECT id FROM wbs_nodes WHERE id = $1
         UNION ALL
         SELECT w.id FROM wbs_nodes w INNER JOIN tree t ON w.parent_id = t.id
       )
       SELECT id FROM tree;`,
      [nodeId],
    );
    const descendantIds = descendantRows.map((r) => r.id);

    // BR-MP-03: chặn nếu bất kỳ descendant có work_items đang NEW/IN_PROGRESS
    const blockingRows = await this.nodeRepo.manager.query<
      Array<{ cnt: string }>
    >(
      `SELECT COUNT(*)::text AS cnt
         FROM work_items wi
         INNER JOIN task_templates tt ON tt.id = wi.task_template_id
         WHERE tt.wbs_node_id = ANY($1::uuid[])
           AND wi.status = ANY($2::work_item_status[])`,
      [descendantIds, [...BLOCKING_WORK_ITEM_STATUSES]],
    );
    const blocking = Number(blockingRows[0]?.cnt ?? '0');
    if (blocking > 0) {
      throw new BadRequestException(
        `BR-MP-03: Không thể archive — còn ${blocking} work_item đang NEW/IN_PROGRESS trong node hoặc node con`,
      );
    }

    // Cascade archive
    await this.nodeRepo
      .createQueryBuilder()
      .update(WbsNode)
      .set({ is_archived: true })
      .where('id = ANY(:ids)', { ids: descendantIds })
      .execute();

    return this.nodeRepo.findOne({ where: { id: nodeId } });
  }

  // ── Task Template ────────────────────────────────────────────
  async addTaskTemplate(wbsNodeId: string, dto: CreateTaskTemplateDto) {
    const node = await this.nodeRepo.findOne({ where: { id: wbsNodeId } });
    if (!node) throw new NotFoundException('Không tìm thấy WBS node');
    if (node.is_archived) {
      throw new BadRequestException('Node đã archive, không thể gắn template');
    }
    const plan = await this.findOne(node.plan_id);
    this.ensurePlanMutable(plan);

    // BA-MP: template chỉ gắn vào node lá (TASK_TEMPLATE) và không có child
    if (node.node_type !== WbsNodeType.TASK_TEMPLATE) {
      throw new BadRequestException(
        `Chỉ gắn Task Template vào node loại TASK_TEMPLATE (node hiện tại: ${node.node_type})`,
      );
    }
    const childCount = await this.nodeRepo.count({
      where: { parent_id: wbsNodeId, is_archived: false },
    });
    if (childCount > 0) {
      throw new BadRequestException(
        'Node đã có node con — không phải node lá, không gắn Task Template',
      );
    }

    // validate RRULE
    try {
      nextOccurrences(dto.recurrence_rule, new Date(), 1);
    } catch (err) {
      throw new BadRequestException(
        `Biểu thức recurrence không hợp lệ: ${(err as Error).message}`,
      );
    }
    return this.tplRepo.save(
      this.tplRepo.create({ wbs_node_id: wbsNodeId, ...dto }),
    );
  }

  async previewTaskTemplate(templateId: string) {
    const tpl = await this.tplRepo.findOne({ where: { id: templateId } });
    if (!tpl) throw new NotFoundException('Không tìm thấy Task Template');
    return nextOccurrences(tpl.recurrence_rule, new Date(), 10);
  }

  async triggerDailyScan() {
    // Dùng để test thủ công, prod chạy qua cron
    const jobId = await this.recurrence.enqueueDailyScan();
    return { jobId };
  }

  // ── Task Templates aggregated theo plan ──────────────────────
  async listTaskTemplatesByPlan(planId: string) {
    await this.findOne(planId);
    return this.tplRepo
      .createQueryBuilder('t')
      .innerJoin(WbsNode, 'w', 'w.id = t.wbs_node_id')
      .where('w.plan_id = :planId', { planId })
      .andWhere('w.is_archived = :archived', { archived: false })
      .select([
        't.id AS id',
        't.name AS name',
        't.work_item_type AS work_item_type',
        't.recurrence_rule AS recurrence_rule',
        't.sla_hours AS sla_hours',
        't.is_active AS is_active',
        't.last_generated_date AS last_generated_date',
        't.default_assignee_role AS default_assignee_role',
        'w.wbs_code AS wbs_code',
        'w.name AS wbs_name',
        'w.id AS wbs_node_id',
      ])
      .orderBy('w.level', 'ASC')
      .addOrderBy('w.sort_order', 'ASC')
      .addOrderBy('w.wbs_code', 'ASC')
      .getRawMany();
  }

  // ── Dashboard KPI ────────────────────────────────────────────
  async dashboard(planId: string) {
    const plan = await this.findOne(planId);
    const nodes = await this.nodeRepo.find({
      where: { plan_id: planId, is_archived: false },
    });
    const totalBudget = nodes.reduce(
      (acc, n) => acc + BigInt(n.budget_vnd || '0'),
      0n,
    );

    // Work items qua task_template_id join — lấy thêm scheduled_at để tính on-time
    const rows = await this.nodeRepo.manager
      .createQueryBuilder()
      .from('work_items', 'wi')
      .innerJoin('task_templates', 'tt', 'tt.id = wi.task_template_id')
      .innerJoin('wbs_nodes', 'wn', 'wn.id = tt.wbs_node_id')
      .where('wn.plan_id = :planId', { planId })
      .select([
        'wi.work_item_type AS type',
        'wi.status AS status',
        'wi.due_date AS due_date',
        'wi.scheduled_at AS scheduled_at',
        'wi.updated_at AS updated_at',
      ])
      .getRawMany<{
        type: string;
        status: string;
        due_date: Date | null;
        scheduled_at: Date | null;
        updated_at: Date | null;
      }>();

    const byType: Record<string, number> = {
      CHECKLIST: 0,
      INCIDENT: 0,
      ENERGY_INSPECTION: 0,
      OFFICE_TASK: 0,
    };
    const byStatus: Record<string, number> = {
      NEW: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
    };
    let overdue = 0;
    let completedOnTime = 0;
    const now = Date.now();
    for (const r of rows) {
      byType[r.type] = (byType[r.type] ?? 0) + 1;
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
      if (
        r.due_date &&
        new Date(r.due_date).getTime() < now &&
        r.status !== 'COMPLETED'
      ) {
        overdue++;
      }
      // On-time: completed trước due_date (fallback scheduled_at nếu thiếu due_date)
      if (r.status === 'COMPLETED' && r.updated_at) {
        const deadline = r.due_date ?? r.scheduled_at;
        if (
          deadline &&
          new Date(r.updated_at).getTime() <= new Date(deadline).getTime()
        ) {
          completedOnTime++;
        }
      }
    }

    const total = rows.length;
    const completedCount = byStatus.COMPLETED ?? 0;
    const progressPct =
      total === 0 ? 0 : Math.round((completedCount / total) * 100);
    const onTimeCompletedPct =
      completedCount === 0
        ? 0
        : Math.round((completedOnTime / completedCount) * 100);

    return {
      plan: {
        id: plan.id,
        code: plan.code,
        status: plan.status,
        year: plan.year,
      },
      budget: {
        totalBudgetVnd: totalBudget.toString(),
        nodeCount: nodes.length,
      },
      workItems: {
        total,
        progressPct,
        onTimeCompletedPct,
        overdueCount: overdue,
        byType,
        byStatus,
      },
    };
  }

  // ── Helpers ──────────────────────────────────────────────────
  private ensurePlanMutable(plan: MasterPlan): void {
    if (plan.status === MasterPlanStatus.CLOSED) {
      throw new BadRequestException(
        'Master Plan đã đóng (CLOSED) — không cho phép thay đổi cây WBS',
      );
    }
  }

  private validateNodeDates(
    start: string | null | undefined,
    end: string | null | undefined,
    plan: MasterPlan,
  ): void {
    if (start && end && start > end) {
      throw new BadRequestException(
        `start_date (${start}) phải ≤ end_date (${end})`,
      );
    }
    if (end && plan.end_date && end > plan.end_date) {
      throw new BadRequestException(
        `BR-MP-05: end_date (${end}) vượt quá end_date của plan (${plan.end_date})`,
      );
    }
    if (start && plan.start_date && start < plan.start_date) {
      throw new BadRequestException(
        `BR-MP-05: start_date (${start}) trước start_date của plan (${plan.start_date})`,
      );
    }
  }
}
