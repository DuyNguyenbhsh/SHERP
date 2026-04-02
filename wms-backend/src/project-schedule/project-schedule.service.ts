import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ProjectTask } from './entities/project-task.entity';
import { TaskLink } from './entities/task-link.entity';
import { ScheduleBaseline } from './entities/schedule-baseline.entity';
import {
  CreateTaskDto,
  UpdateTaskDto,
  CreateLinkDto,
} from './dto/schedule.dto';
import { ScheduleApprovalStatus, LinkType } from './enums/schedule.enum';
import { calculateCPM, detectCycle, offsetToDate } from './domain/cpm.logic';
import type { CpmLink } from './domain/cpm.logic';

@Injectable()
export class ProjectScheduleService {
  constructor(
    @InjectRepository(ProjectTask) private taskRepo: Repository<ProjectTask>,
    @InjectRepository(TaskLink) private linkRepo: Repository<TaskLink>,
    @InjectRepository(ScheduleBaseline)
    private baselineRepo: Repository<ScheduleBaseline>,
    private dataSource: DataSource,
  ) {}

  // ══════════════════════════════════════════
  // TASK CRUD
  // ══════════════════════════════════════════

  async createTask(dto: CreateTaskDto, userId?: string) {
    const task = this.taskRepo.create({
      project_id: dto.project_id,
      task_code: dto.task_code,
      name: dto.name,
      description: dto.description,
      duration_days: dto.duration_days,
      start_date: dto.start_date ? new Date(dto.start_date) : undefined,
      wbs_id: dto.wbs_id,
      planned_labor: dto.planned_labor ?? 0,
      resource_notes: dto.resource_notes,
      sort_order: dto.sort_order ?? 0,
    });
    const saved = await this.taskRepo.save(task);

    // Auto-recalculate schedule
    await this.recalculate(dto.project_id);

    return {
      status: 'success',
      message: `Tạo task ${saved.task_code}`,
      data: saved,
    };
  }

  async updateTask(taskId: string, dto: UpdateTaskDto) {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task)
      throw new NotFoundException({
        status: 'error',
        message: 'Task không tồn tại!',
        data: null,
      });

    if (dto.name !== undefined) task.name = dto.name;
    if (dto.duration_days !== undefined) task.duration_days = dto.duration_days;
    if (dto.start_date !== undefined)
      task.start_date = new Date(dto.start_date);
    if (dto.progress_percent !== undefined)
      task.progress_percent = dto.progress_percent;
    if (dto.planned_labor !== undefined) task.planned_labor = dto.planned_labor;
    if (dto.resource_notes !== undefined)
      task.resource_notes = dto.resource_notes;
    if (dto.description !== undefined) task.description = dto.description;

    const saved = await this.taskRepo.save(task);

    // Auto-recalculate khi thay đổi duration hoặc start_date
    if (dto.duration_days !== undefined || dto.start_date !== undefined) {
      await this.recalculate(task.project_id);
    }

    return {
      status: 'success',
      message: `Cập nhật task ${saved.task_code}`,
      data: saved,
    };
  }

  async deleteTask(taskId: string) {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task)
      throw new NotFoundException({
        status: 'error',
        message: 'Task không tồn tại!',
        data: null,
      });

    await this.linkRepo.delete({ predecessor_id: taskId });
    await this.linkRepo.delete({ successor_id: taskId });
    await this.taskRepo.delete(taskId);

    await this.recalculate(task.project_id);
    return {
      status: 'success',
      message: `Xóa task ${task.task_code}`,
      data: null,
    };
  }

  async findTasks(projectId: string) {
    const tasks = await this.taskRepo.find({
      where: { project_id: projectId },
      order: { sort_order: 'ASC', task_code: 'ASC' },
    });
    return { status: 'success', data: tasks };
  }

  // ══════════════════════════════════════════
  // TASK LINKS (with cycle validation)
  // ══════════════════════════════════════════

  async createLink(dto: CreateLinkDto) {
    // Validate tasks exist
    const [pred, succ] = await Promise.all([
      this.taskRepo.findOne({
        where: { id: dto.predecessor_id, project_id: dto.project_id },
      }),
      this.taskRepo.findOne({
        where: { id: dto.successor_id, project_id: dto.project_id },
      }),
    ]);
    if (!pred || !succ)
      throw new NotFoundException({
        status: 'error',
        message: 'Task tiền nhiệm hoặc kế nhiệm không tồn tại!',
        data: null,
      });
    if (dto.predecessor_id === dto.successor_id)
      throw new BadRequestException({
        status: 'error',
        message: 'Task không thể link tới chính nó!',
        data: null,
      });

    // ── CYCLE DETECTION: Trước khi tạo link, check cycle ──
    const existingLinks = await this.linkRepo.find({
      where: { project_id: dto.project_id },
    });
    const allTasks = await this.taskRepo.find({
      where: { project_id: dto.project_id },
    });
    const testLinks: CpmLink[] = [
      ...existingLinks.map((l) => ({
        predecessor_id: l.predecessor_id,
        successor_id: l.successor_id,
        lag_days: l.lag_days,
      })),
      {
        predecessor_id: dto.predecessor_id,
        successor_id: dto.successor_id,
        lag_days: dto.lag_days ?? 0,
      },
    ];

    const cycle = detectCycle(
      allTasks.map((t) => t.id),
      testLinks,
    );
    if (cycle) {
      throw new BadRequestException({
        status: 'error',
        message: `Phát hiện vòng lặp! Không thể tạo mối quan hệ này. Chuỗi: ${cycle.join(' → ')}`,
        data: { cycle },
      });
    }

    const link = this.linkRepo.create({
      project_id: dto.project_id,
      predecessor_id: dto.predecessor_id,
      successor_id: dto.successor_id,
      link_type: dto.link_type ?? LinkType.FS,
      lag_days: dto.lag_days ?? 0,
    });

    const saved = await this.linkRepo.save(link);

    // Auto-recalculate
    await this.recalculate(dto.project_id);

    return {
      status: 'success',
      message: 'Tạo mối quan hệ thành công',
      data: saved,
    };
  }

  async deleteLink(linkId: string) {
    const link = await this.linkRepo.findOne({ where: { id: linkId } });
    if (!link)
      throw new NotFoundException({
        status: 'error',
        message: 'Link không tồn tại!',
        data: null,
      });

    await this.linkRepo.delete(linkId);
    await this.recalculate(link.project_id);

    return { status: 'success', message: 'Xóa mối quan hệ', data: null };
  }

  async findLinks(projectId: string) {
    const links = await this.linkRepo.find({
      where: { project_id: projectId },
    });
    return { status: 'success', data: links };
  }

  // ══════════════════════════════════════════
  // CPM RECALCULATION ENGINE
  // ══════════════════════════════════════════

  /**
   * Tính toán lại toàn bộ lịch trình dự án khi bất kỳ task nào thay đổi.
   * Sử dụng thuật toán CPM (Critical Path Method).
   */
  async recalculate(projectId: string) {
    const tasks = await this.taskRepo.find({
      where: { project_id: projectId },
    });
    const links = await this.linkRepo.find({
      where: { project_id: projectId },
    });

    if (tasks.length === 0) return;

    const cpmLinks: CpmLink[] = links.map((l) => ({
      predecessor_id: l.predecessor_id,
      successor_id: l.successor_id,
      lag_days: l.lag_days,
    }));

    const cpmResult = calculateCPM(
      tasks.map((t) => ({ id: t.id, duration_days: t.duration_days })),
      cpmLinks,
    );

    // Tìm project start date (ngày bắt đầu sớm nhất từ tasks có start_date)
    let projectStart: Date | null = null;
    for (const t of tasks) {
      if (t.start_date) {
        if (!projectStart || t.start_date < projectStart) {
          projectStart = t.start_date;
        }
      }
    }
    if (!projectStart) projectStart = new Date();

    // Update tất cả tasks với kết quả CPM
    for (const task of tasks) {
      const cpm = cpmResult.tasks.get(task.id);
      if (!cpm) continue;

      task.early_start = cpm.early_start;
      task.early_finish = cpm.early_finish;
      task.late_start = cpm.late_start;
      task.late_finish = cpm.late_finish;
      task.total_float = cpm.total_float;
      task.is_critical = cpm.is_critical;

      // Convert offset → actual dates
      task.start_date = offsetToDate(projectStart, cpm.early_start);
      task.end_date = offsetToDate(projectStart, cpm.early_finish);
    }

    await this.taskRepo.save(tasks);

    return {
      project_duration: cpmResult.project_duration,
      critical_path_ids: cpmResult.critical_path_ids,
      project_end_date: offsetToDate(projectStart, cpmResult.project_duration),
    };
  }

  // ══════════════════════════════════════════
  // FULL SCHEDULE DATA (for Gantt Chart)
  // ══════════════════════════════════════════

  async getScheduleData(projectId: string) {
    const [tasks, links] = await Promise.all([
      this.taskRepo.find({
        where: { project_id: projectId },
        order: { sort_order: 'ASC', task_code: 'ASC' },
      }),
      this.linkRepo.find({ where: { project_id: projectId } }),
    ]);

    // Resource summary: tổng nhân công theo ngày
    const resourceByDate = new Map<string, number>();
    for (const t of tasks) {
      if (t.start_date && t.end_date && t.planned_labor > 0) {
        const start = new Date(t.start_date);
        const end = new Date(t.end_date);
        for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
          const key = d.toISOString().split('T')[0];
          resourceByDate.set(
            key,
            (resourceByDate.get(key) ?? 0) + t.planned_labor,
          );
        }
      }
    }

    const resourceTimeline = Array.from(resourceByDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, labor]) => ({ date, labor }));

    return {
      status: 'success',
      data: {
        tasks,
        links,
        critical_path_ids: tasks.filter((t) => t.is_critical).map((t) => t.id),
        resource_timeline: resourceTimeline,
      },
    };
  }

  // ══════════════════════════════════════════
  // SCHEDULE BASELINES (Freeze on approval)
  // ══════════════════════════════════════════

  async createBaseline(
    projectId: string,
    title: string,
    userId: string,
    userName?: string,
  ) {
    const scheduleData = await this.getScheduleData(projectId);
    const d = scheduleData.data;

    const maxVersion = await this.baselineRepo
      .createQueryBuilder('b')
      .select('MAX(b.version)', 'max')
      .where('b.project_id = :pid', { pid: projectId })
      .getRawOne();

    const baseline = this.baselineRepo.create({
      project_id: projectId,
      version: parseInt(maxVersion?.max || '0', 10) + 1,
      title,
      snapshot_data: {
        tasks: d.tasks as unknown as Record<string, unknown>[],
        links: d.links as unknown as Record<string, unknown>[],
        project_end_date:
          d.tasks.length > 0
            ? d.tasks.reduce(
                (max, t) =>
                  t.end_date && new Date(t.end_date) > new Date(max)
                    ? t.end_date.toString()
                    : max,
                d.tasks[0]?.end_date?.toString() ?? '',
              )
            : null,
        critical_path_ids: d.critical_path_ids,
        total_duration_days:
          d.tasks.length > 0
            ? Math.max(...d.tasks.map((t) => t.early_finish ?? 0))
            : 0,
      },
      status: ScheduleApprovalStatus.DRAFT,
      created_by: userId,
      created_by_name: userName ?? '',
    });

    const saved = await this.baselineRepo.save(baseline);
    return {
      status: 'success',
      message: `Tạo baseline v${saved.version}`,
      data: saved,
    };
  }

  async approveBaseline(baselineId: string, userId: string, userName?: string) {
    const baseline = await this.baselineRepo.findOne({
      where: { id: baselineId },
    });
    if (!baseline)
      throw new NotFoundException({
        status: 'error',
        message: 'Baseline không tồn tại!',
        data: null,
      });
    if (baseline.frozen_at)
      throw new ForbiddenException({
        status: 'error',
        message: 'Baseline đã bị khóa vĩnh viễn!',
        data: null,
      });

    baseline.status = ScheduleApprovalStatus.APPROVED;
    baseline.frozen_at = new Date();
    baseline.approved_by = userId;
    baseline.approved_by_name = userName ?? '';
    await this.baselineRepo.save(baseline);

    return {
      status: 'success',
      message: `Baseline v${baseline.version} đã phê duyệt — Dữ liệu tiến độ bị khóa.`,
      data: baseline,
    };
  }

  async findBaselines(projectId: string) {
    const baselines = await this.baselineRepo.find({
      where: { project_id: projectId },
      order: { version: 'DESC' },
    });
    return { status: 'success', data: baselines };
  }
}
