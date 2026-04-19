import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { WorkItemsService } from '../work-items/work-items.service';
import { OfficeTask } from './entities/office-task.entity';
import { OfficeTaskItem } from './entities/office-task-item.entity';
import { OfficeTaskStatus } from './enums/office-task.enum';
import { CreateOfficeTaskDto } from './dto/create-office-task.dto';
import { AddItemDto } from './dto/add-item.dto';
import { ToggleItemDto } from './dto/toggle-item.dto';
import { computeTransition } from './domain/logic/office-task-transition.logic';

@Injectable()
export class OfficeTasksService {
  constructor(
    @InjectRepository(OfficeTask)
    private readonly taskRepo: Repository<OfficeTask>,
    @InjectRepository(OfficeTaskItem)
    private readonly itemRepo: Repository<OfficeTaskItem>,
    private readonly dataSource: DataSource,
    private readonly workItems: WorkItemsService,
  ) {}

  async create(dto: CreateOfficeTaskDto) {
    return this.dataSource.transaction(async (mgr) => {
      const task = mgr.create(OfficeTask, {
        title: dto.title,
        description: dto.description ?? null,
        project_id: dto.project_id,
        work_item_id: dto.work_item_id ?? null,
        assignee_id: dto.assignee_id,
        due_date: dto.due_date ? new Date(dto.due_date) : null,
        status: OfficeTaskStatus.NEW,
        attachments: dto.attachments ?? [],
      });
      const saved = await mgr.save(task);

      if (dto.items?.length) {
        const items = dto.items.map((i) =>
          mgr.create(OfficeTaskItem, {
            task_id: saved.id,
            display_order: i.display_order,
            content: i.content,
          }),
        );
        await mgr.save(items);
      }

      return mgr.findOne(OfficeTask, {
        where: { id: saved.id },
        relations: ['items'],
      });
    });
  }

  async list(filter: {
    projectId?: string;
    assigneeId?: string;
    status?: OfficeTaskStatus;
  }) {
    const where: Record<string, unknown> = {};
    if (filter.projectId) where.project_id = filter.projectId;
    if (filter.assigneeId) where.assignee_id = filter.assigneeId;
    if (filter.status) where.status = filter.status;
    return this.taskRepo.find({
      where,
      order: { created_at: 'DESC' },
      take: 100,
    });
  }

  async findOne(id: string) {
    const task = await this.taskRepo.findOne({
      where: { id },
      relations: ['items'],
    });
    if (!task) throw new NotFoundException('Không tìm thấy Office Task');
    return task;
  }

  async addItem(taskId: string, dto: AddItemDto) {
    const task = await this.findOne(taskId);
    if (task.status === OfficeTaskStatus.COMPLETED) {
      throw new BadRequestException('Task đã hoàn thành, không thêm item');
    }
    return this.itemRepo.save(
      this.itemRepo.create({
        task_id: taskId,
        display_order: dto.display_order,
        content: dto.content,
      }),
    );
  }

  // BR-OT-01: toggle item → recompute parent status
  async toggleItem(
    taskId: string,
    itemId: string,
    dto: ToggleItemDto,
    actorId: string,
  ) {
    return this.dataSource.transaction(async (mgr) => {
      const task = await mgr.findOne(OfficeTask, {
        where: { id: taskId },
        relations: ['items'],
      });
      if (!task) throw new NotFoundException('Không tìm thấy Office Task');
      if (task.status === OfficeTaskStatus.COMPLETED) {
        throw new BadRequestException('Task đã COMPLETED, không sửa được item');
      }

      const item = task.items.find((i) => i.id === itemId);
      if (!item) throw new NotFoundException('Item không thuộc task này');

      item.is_done = dto.is_done;
      item.completed_by = dto.is_done ? actorId : null;
      item.completed_at = dto.is_done ? new Date() : null;
      await mgr.save(item);

      const doneCount = task.items.reduce(
        (acc, i) =>
          acc + (i.id === itemId ? (dto.is_done ? 1 : 0) : i.is_done ? 1 : 0),
        0,
      );
      const trans = computeTransition({
        totalItems: task.items.length,
        doneItems: doneCount,
        currentStatus: task.status,
      });
      task.status = trans.nextStatus;
      if (trans.shouldCompleteNow) task.completed_at = new Date();
      await mgr.save(task);

      if (task.work_item_id) {
        await this.workItems.syncProgress(
          task.work_item_id,
          trans.progressPct,
          trans.shouldCompleteNow,
        );
      }

      return { item, taskStatus: task.status, progressPct: trans.progressPct };
    });
  }

  // BR-OT-02: task không có item → cần endpoint explicit để complete
  async complete(taskId: string) {
    const task = await this.findOne(taskId);
    if (task.status === OfficeTaskStatus.COMPLETED) {
      throw new BadRequestException('Task đã hoàn thành');
    }
    if (task.items.length > 0) {
      const allDone = task.items.every((i) => i.is_done);
      if (!allDone) {
        throw new BadRequestException(
          'Task có item chưa done — hãy tick hết items thay vì gọi complete',
        );
      }
    }
    task.status = OfficeTaskStatus.COMPLETED;
    task.completed_at = new Date();
    const saved = await this.taskRepo.save(task);

    if (task.work_item_id) {
      await this.workItems.syncProgress(task.work_item_id, 100, true);
    }
    return saved;
  }
}
