import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository, DataSource } from 'typeorm';
import { WorkItem } from '../../work-items/entities/work-item.entity';
import {
  WorkItemStatus,
  WorkItemType,
} from '../../work-items/enums/work-item.enum';
import { TaskTemplate } from '../entities/task-template.entity';
import { WbsNode } from '../entities/wbs-node.entity';
import { MasterPlan } from '../entities/master-plan.entity';
import { MasterPlanStatus } from '../enums/master-plan.enum';
import { nextOccurrences } from '../domain/logic/rrule-parser.logic';
import {
  MASTER_PLAN_RECURRENCE_QUEUE,
  DailyScanJobData,
  GenerateItemJobData,
} from './recurrence.constants';
import { RecurrenceProducer } from './recurrence.producer';
import { ChecklistsService } from '../../checklists/checklists.service';
import { OfficeTasksService } from '../../office-tasks/office-tasks.service';
import { EnergyInspectionService } from '../../energy-inspection/energy-inspection.service';

@Processor(MASTER_PLAN_RECURRENCE_QUEUE, { concurrency: 4 })
export class RecurrenceProcessor extends WorkerHost {
  private readonly logger = new Logger(RecurrenceProcessor.name);

  constructor(
    @InjectRepository(TaskTemplate)
    private readonly tplRepo: Repository<TaskTemplate>,
    private readonly dataSource: DataSource,
    private readonly checklists: ChecklistsService,
    private readonly officeTasks: OfficeTasksService,
    private readonly energy: EnergyInspectionService,
    private readonly producer: RecurrenceProducer,
  ) {
    super();
  }

  async process(job: Job<DailyScanJobData | GenerateItemJobData>) {
    if (job.name === 'daily-scan')
      return this.handleDailyScan(job as Job<DailyScanJobData>);
    if (job.name === 'generate-item')
      return this.handleGenerate(job as Job<GenerateItemJobData>);
    throw new Error(`Unknown job name: ${job.name}`);
  }

  // ── Daily scan: quét active templates, match ngày hôm nay → enqueue generate ──
  private async handleDailyScan(job: Job<DailyScanJobData>) {
    const today = new Date(job.data.runAt);
    today.setUTCHours(0, 0, 0, 0);
    const todayIso = today.toISOString().slice(0, 10);

    const templates = await this.tplRepo
      .createQueryBuilder('t')
      .innerJoin(WbsNode, 'w', 'w.id = t.wbs_node_id')
      .innerJoin(MasterPlan, 'p', 'p.id = w.plan_id')
      .where('t.is_active = :active', { active: true })
      .andWhere('p.status = :status', { status: MasterPlanStatus.ACTIVE })
      .andWhere('w.is_archived = :archived', { archived: false })
      .select([
        't.id AS id',
        't.recurrence_rule AS recurrence_rule',
        't.last_generated_date AS last_generated_date',
      ])
      .getRawMany<{
        id: string;
        recurrence_rule: string;
        last_generated_date: string | null;
      }>();

    let enqueued = 0;
    const errors: string[] = [];

    // End-of-today UTC (exclusive) — giữ mọi occurrence trong hôm nay bất kể giờ
    const endOfTodayMs = today.getTime() + 24 * 3600 * 1000;

    for (const tpl of templates) {
      try {
        const startFrom = tpl.last_generated_date
          ? new Date(`${tpl.last_generated_date}T00:00:00Z`)
          : today;
        const occurrences = nextOccurrences(tpl.recurrence_rule, startFrom, 40);
        const lastGenIso = tpl.last_generated_date
          ? `${tpl.last_generated_date}T00:00:00.000Z`
          : '';
        const matching = occurrences.filter((d) => {
          // Giữ mọi occurrence ≤ cuối ngày hôm nay và > mốc đã sinh trước đó
          if (d.getTime() >= endOfTodayMs) return false;
          return d.toISOString() > lastGenIso;
        });

        for (const occ of matching) {
          await this.producer.enqueueGenerate({
            taskTemplateId: tpl.id,
            scheduledAt: occ.toISOString(),
          });
          enqueued++;
        }
      } catch (err) {
        const msg = `template=${tpl.id}: ${(err as Error).message}`;
        this.logger.warn(`[daily-scan] ${msg}`);
        errors.push(msg);
      }
    }

    this.logger.log(
      `[daily-scan] quét ${templates.length} templates, enqueue ${enqueued} generate jobs`,
    );
    return {
      scannedAt: job.data.runAt,
      templatesScanned: templates.length,
      enqueued,
      errors,
    };
  }

  // ── Generate item: tạo WorkItem + subject row theo type ──
  private async handleGenerate(job: Job<GenerateItemJobData>) {
    const { taskTemplateId, scheduledAt } = job.data;
    const scheduledAtDate = new Date(scheduledAt);
    const workItemRepo = this.dataSource.getRepository(WorkItem);

    // Idempotent: check work_item đã tồn tại
    const existing = await workItemRepo.findOne({
      where: {
        task_template_id: taskTemplateId,
        scheduled_at: scheduledAtDate,
      },
    });
    if (existing) {
      this.logger.log(
        `[generate-item] đã tồn tại, skip: ${taskTemplateId} @ ${scheduledAt}`,
      );
      return { status: 'already-exists', workItemId: existing.id };
    }

    const tpl = await this.tplRepo.findOne({
      where: { id: taskTemplateId },
      relations: ['wbs_node', 'wbs_node.master_plan'],
    });
    if (!tpl) throw new Error(`TaskTemplate không tồn tại: ${taskTemplateId}`);

    const plan = tpl.wbs_node.master_plan;
    const assigneeId = tpl.wbs_node.responsible_employee_id;
    if (!assigneeId) {
      const msg = `WBS node ${tpl.wbs_node.wbs_code} chưa có responsible_employee_id — không thể auto-assign`;
      this.logger.warn(`[generate-item] ${msg}`);
      return { status: 'skipped-no-assignee', reason: msg };
    }

    if (tpl.work_item_type === WorkItemType.INCIDENT) {
      this.logger.warn(
        `[generate-item] Bỏ qua INCIDENT ${taskTemplateId} — incident là reactive`,
      );
      return { status: 'skipped-incident-not-auto' };
    }

    const dueDate = new Date(
      scheduledAtDate.getTime() + tpl.sla_hours * 3600 * 1000,
    );
    const scheduledDateIso = scheduledAt.slice(0, 10); // YYYY-MM-DD cho title + last_generated_date
    const title = `${tpl.name} - ${scheduledDateIso}`;

    return this.dataSource.transaction(async (mgr) => {
      const workItem = mgr.create(WorkItem, {
        work_item_type: tpl.work_item_type,
        project_id: plan.project_id,
        assignee_id: assigneeId,
        task_template_id: taskTemplateId,
        scheduled_at: scheduledAtDate,
        due_date: dueDate,
        status: WorkItemStatus.NEW,
        progress_pct: 0,
        title,
      });
      const savedWi = await mgr.save(workItem);

      let subjectId: string | null = null;

      if (tpl.work_item_type === WorkItemType.CHECKLIST) {
        if (!tpl.template_ref_id) {
          throw new Error(
            'CHECKLIST template chưa có template_ref_id (ChecklistTemplate)',
          );
        }
        const instance = await this.checklists.createInstance({
          template_id: tpl.template_ref_id,
          assignee_id: assigneeId,
          work_item_id: savedWi.id,
          due_date: dueDate.toISOString(),
        });
        subjectId = instance.id;
      } else if (tpl.work_item_type === WorkItemType.OFFICE_TASK) {
        const task = await this.officeTasks.create({
          title,
          project_id: plan.project_id,
          work_item_id: savedWi.id,
          assignee_id: assigneeId,
          due_date: dueDate.toISOString(),
        });
        subjectId = task?.id ?? null;
      } else if (tpl.work_item_type === WorkItemType.ENERGY_INSPECTION) {
        const meters = await this.energy.listMeters({
          projectId: plan.project_id,
          active: true,
        });
        if (meters.length === 0) {
          throw new Error(`Project ${plan.project_id} chưa có active meter`);
        }
        const inspection = await this.energy.createInspection({
          project_id: plan.project_id,
          work_item_id: savedWi.id,
          assignee_id: assigneeId,
          inspection_date: scheduledDateIso,
          due_date: dueDate.toISOString(),
          required_meter_ids: meters.map((m) => m.id),
        });
        subjectId = inspection.id;
      }

      if (subjectId) {
        savedWi.subject_id = subjectId;
        await mgr.save(savedWi);
      }

      await mgr.update(
        TaskTemplate,
        { id: taskTemplateId },
        { last_generated_date: scheduledDateIso },
      );

      return { status: 'created', workItemId: savedWi.id, subjectId };
    });
  }
}
