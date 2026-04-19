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
import { CreateTaskTemplateDto } from './dto/create-task-template.dto';
import { MasterPlanStatus } from './enums/master-plan.enum';
import { nextOccurrences } from './domain/logic/rrule-parser.logic';
import { RecurrenceProducer } from './queues/recurrence.producer';

@Injectable()
export class MasterPlanService {
  constructor(
    @InjectRepository(MasterPlan)
    private readonly planRepo: Repository<MasterPlan>,
    @InjectRepository(WbsNode) private readonly nodeRepo: Repository<WbsNode>,
    @InjectRepository(TaskTemplate)
    private readonly tplRepo: Repository<TaskTemplate>,
    private readonly recurrence: RecurrenceProducer,
  ) {}

  // ── Master Plan CRUD ─────────────────────────────────────────
  async create(dto: CreateMasterPlanDto) {
    const existed = await this.planRepo.findOne({
      where: { project_id: dto.project_id, year: dto.year },
    });
    if (existed) {
      throw new ConflictException(
        `Dự án đã có Master Plan năm ${dto.year} (code ${existed.code})`,
      );
    }
    return this.planRepo.save(this.planRepo.create(dto));
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
    // TODO Gate 4: gọi BudgetService.checkBudgetLimit() theo dev-rules
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
    await this.findOne(planId);
    const dup = await this.nodeRepo.findOne({
      where: { plan_id: planId, wbs_code: dto.wbs_code },
    });
    if (dup)
      throw new ConflictException(`WBS code đã tồn tại: ${dto.wbs_code}`);
    return this.nodeRepo.save(
      this.nodeRepo.create({ plan_id: planId, ...dto }),
    );
  }

  async getWbsTree(planId: string) {
    return this.nodeRepo.find({
      where: { plan_id: planId, is_archived: false },
      order: { wbs_code: 'ASC' },
    });
  }

  async archiveWbsNode(nodeId: string) {
    const node = await this.nodeRepo.findOne({ where: { id: nodeId } });
    if (!node) throw new NotFoundException('Không tìm thấy WBS node');
    node.is_archived = true;
    return this.nodeRepo.save(node);
  }

  // ── Task Template ────────────────────────────────────────────
  async addTaskTemplate(wbsNodeId: string, dto: CreateTaskTemplateDto) {
    const node = await this.nodeRepo.findOne({ where: { id: wbsNodeId } });
    if (!node) throw new NotFoundException('Không tìm thấy WBS node');
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
      .orderBy('w.wbs_code', 'ASC')
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

    // Work items qua task_template_id join
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
      ])
      .getRawMany<{
        type: string;
        status: string;
        due_date: Date | null;
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
    }

    const total = rows.length;
    const progressPct =
      total === 0 ? 0 : Math.round(((byStatus.COMPLETED ?? 0) / total) * 100);
    const onTimeCompletedPct =
      (byStatus.COMPLETED ?? 0) === 0
        ? 0
        : Math.round(
            ((byStatus.COMPLETED - 0) / (byStatus.COMPLETED ?? 1)) * 100,
          );

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
}
