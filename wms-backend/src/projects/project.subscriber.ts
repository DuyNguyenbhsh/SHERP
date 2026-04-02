import {
  EntitySubscriberInterface,
  EventSubscriber,
  UpdateEvent,
  DataSource,
} from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { ProjectHistory } from './entities/project-history.entity';
import { getAuditContext } from '../shared/audit/audit-context.store';

/**
 * Danh sách trường nhạy cảm cần tự động ghi audit log.
 * Khi bất kỳ trường nào thay đổi → tạo bản ghi project_history.
 */
const AUDITED_FIELDS = [
  'manager_id',
  'department_id',
  'investor_id',
  'organization_id',
  'budget',
  'status',
  'stage',
];

/**
 * TypeORM EntitySubscriber — tự động ghi audit log khi Project thay đổi.
 *
 * Cơ chế:
 * 1. afterUpdate: So sánh old entity (loaded từ DB) vs new entity (sau save)
 * 2. Chỉ ghi log cho các trường trong AUDITED_FIELDS
 * 3. Lấy user + change_reason từ AsyncLocalStorage (set bởi AuditInterceptor)
 * 4. Resolve label (tên nhân viên, phòng ban) qua query nhanh
 * 5. Ghi log non-blocking qua process.nextTick()
 */
@EventSubscriber()
@Injectable()
export class ProjectSubscriber implements EntitySubscriberInterface<Project> {
  private readonly logger = new Logger(ProjectSubscriber.name);

  constructor(@InjectDataSource() private dataSource: DataSource) {
    // Đăng ký subscriber với DataSource
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return Project;
  }

  /**
   * afterUpdate — so sánh snapshot cũ vs entity mới, ghi audit log.
   * Dùng process.nextTick() để không block response.
   */
  afterUpdate(event: UpdateEvent<Project>): void {
    // event.databaseEntity = snapshot CŨ (TypeORM tự load khi entity có relations)
    // event.entity = giá trị MỚI đã save
    const oldEntity = event.databaseEntity;
    const newEntity = event.entity;

    if (!oldEntity || !newEntity) return;

    // Lấy request context từ AsyncLocalStorage
    const ctx = getAuditContext();

    // So sánh diff — fire-and-forget
    process.nextTick(() => {
      this.processAuditLog(
        oldEntity as unknown as Record<string, unknown>,
        newEntity as unknown as Record<string, unknown>,
        ctx,
      ).catch((err) => this.logger.error('Lỗi ghi audit log', err));
    });
  }

  private async processAuditLog(
    oldEntity: Record<string, unknown>,
    newEntity: Record<string, unknown>,
    ctx?: {
      userId?: string;
      username?: string;
      changeReason?: string;
      ip?: string;
      userAgent?: string;
    },
  ) {
    const projectId = String(oldEntity.id ?? newEntity.id);
    const historyRepo = this.dataSource.getRepository(ProjectHistory);
    const entries: Partial<ProjectHistory>[] = [];

    for (const field of AUDITED_FIELDS) {
      const oldVal = oldEntity[field];
      const newVal = newEntity[field];

      // Bỏ qua nếu không thay đổi
      if (newVal === undefined) continue;
      if (String(newVal ?? '') === String(oldVal ?? '')) continue;

      // Resolve labels cho FK fields
      const labels = await this.resolveLabels(field, oldVal, newVal);

      // Budget metadata
      const metadata: Record<string, unknown> = {};
      if (field === 'budget') {
        const oldNum = oldVal != null ? Number(oldVal) : 0;
        const newNum = newVal != null ? Number(newVal) : 0;
        metadata.old_formatted = oldNum.toLocaleString('vi-VN') + ' ₫';
        metadata.new_formatted = newNum.toLocaleString('vi-VN') + ' ₫';
        metadata.difference = (newNum - oldNum).toLocaleString('vi-VN') + ' ₫';
      }
      if (labels.oldLabel) metadata.old_label = labels.oldLabel;
      if (labels.newLabel) metadata.new_label = labels.newLabel;
      if (ctx?.ip) metadata.ip = ctx.ip;
      if (ctx?.userAgent) metadata.user_agent = ctx.userAgent;

      entries.push({
        project_id: projectId,
        field_name: field,
        old_value: oldVal != null ? String(oldVal) : undefined,
        new_value: newVal != null ? String(newVal) : undefined,
        old_label: labels.oldLabel,
        new_label: labels.newLabel,
        changed_by: ctx?.userId ?? ctx?.username,
        change_reason: ctx?.changeReason,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      });
    }

    if (entries.length > 0) {
      await historyRepo.save(entries.map((e) => historyRepo.create(e)));
      this.logger.log(`Ghi ${entries.length} audit log cho dự án ${projectId}`);
    }
  }

  /**
   * Resolve FK ID → tên hiển thị bằng query nhanh.
   */
  private async resolveLabels(
    field: string,
    oldVal: unknown,
    newVal: unknown,
  ): Promise<{ oldLabel?: string; newLabel?: string }> {
    const result: { oldLabel?: string; newLabel?: string } = {};

    if (field === 'manager_id') {
      const empRepo = this.dataSource.getRepository('Employee');
      if (oldVal) {
        const emp = await empRepo.findOne({ where: { id: String(oldVal) } });
        if (emp)
          result.oldLabel = (emp as Record<string, unknown>)
            .full_name as string;
      }
      if (newVal) {
        const emp = await empRepo.findOne({ where: { id: String(newVal) } });
        if (emp)
          result.newLabel = (emp as Record<string, unknown>)
            .full_name as string;
      }
    } else if (field === 'department_id' || field === 'organization_id') {
      const orgRepo = this.dataSource.getRepository('Organization');
      if (oldVal) {
        const org = await orgRepo.findOne({ where: { id: String(oldVal) } });
        if (org)
          result.oldLabel = (org as Record<string, unknown>)
            .organization_name as string;
      }
      if (newVal) {
        const org = await orgRepo.findOne({ where: { id: String(newVal) } });
        if (org)
          result.newLabel = (org as Record<string, unknown>)
            .organization_name as string;
      }
    } else if (field === 'investor_id') {
      const supRepo = this.dataSource.getRepository('Supplier');
      if (oldVal) {
        const sup = await supRepo.findOne({ where: { id: String(oldVal) } });
        if (sup)
          result.oldLabel = (sup as Record<string, unknown>).name as string;
      }
      if (newVal) {
        const sup = await supRepo.findOne({ where: { id: String(newVal) } });
        if (sup)
          result.newLabel = (sup as Record<string, unknown>).name as string;
      }
    } else if (field === 'status' || field === 'stage') {
      // Status/stage are enums — dùng value làm label
      if (oldVal) result.oldLabel = String(oldVal);
      if (newVal) result.newLabel = String(newVal);
    }

    return result;
  }
}
