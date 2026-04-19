import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';
import { WorkItem } from './entities/work-item.entity';
import { WorkItemStatus } from './enums/work-item.enum';
import { QueryWorkItemFeedDto } from './dto/query-work-item-feed.dto';
import { ReassignWorkItemDto } from './dto/reassign-work-item.dto';

@Injectable()
export class WorkItemsService {
  constructor(
    @InjectRepository(WorkItem) private readonly repo: Repository<WorkItem>,
  ) {}

  async feed(query: QueryWorkItemFeedDto, currentUserId: string) {
    const where: Record<string, unknown> = {};
    if (query.types?.length) where.work_item_type = In(query.types);
    if (query.statuses?.length) where.status = In(query.statuses);
    if (query.onlyMine !== false) where.assignee_id = currentUserId;
    else if (query.assigneeId) where.assignee_id = query.assigneeId;
    if (query.from) where.due_date = MoreThanOrEqual(new Date(query.from));
    if (query.to) {
      where.due_date = where.due_date
        ? {
            ...(where.due_date as object),
            ...LessThanOrEqual(new Date(query.to)),
          }
        : LessThanOrEqual(new Date(query.to));
    }
    const limit = Math.min(query.limit ?? 20, 100);
    return this.repo.find({
      where,
      order: { due_date: 'ASC', created_at: 'DESC' },
      take: limit,
    });
  }

  async findOne(id: string) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Không tìm thấy công việc');
    return item;
  }

  async reassign(id: string, dto: ReassignWorkItemDto) {
    const item = await this.findOne(id);
    item.assignee_id = dto.assigneeId;
    return this.repo.save(item);
  }

  // Dùng bởi sub-module (Checklist/Incident/…) khi instance của chúng hoàn tất
  async syncProgress(id: string, progressPct: number, completed: boolean) {
    const status = completed
      ? WorkItemStatus.COMPLETED
      : progressPct > 0
        ? WorkItemStatus.IN_PROGRESS
        : WorkItemStatus.NEW;
    await this.repo.update({ id }, { progress_pct: progressPct, status });
  }
}
