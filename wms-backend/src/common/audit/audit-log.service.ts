import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from './audit-log.entity';
import { getAuditContext } from './audit-context.store';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
  ) {}

  /**
   * Ghi audit log — tự lấy actor từ AuditInterceptor context.
   */
  async log(params: {
    action: AuditAction;
    entityName: string;
    entityId: string;
    oldData?: Record<string, unknown>;
    newData?: Record<string, unknown>;
    reason?: string;
  }): Promise<void> {
    const ctx = getAuditContext();
    const changes =
      params.oldData && params.newData
        ? this.diff(params.oldData, params.newData)
        : null;

    const entry = this.auditRepo.create({
      action: params.action,
      entity_name: params.entityName,
      entity_id: params.entityId,
      old_data: params.oldData ?? undefined,
      new_data: params.newData ?? undefined,
      changes: changes ?? undefined,
      actor_id: ctx?.userId,
      actor_name: ctx?.username,
      ip_address: ctx?.ip,
      user_agent: ctx?.userAgent,
      reason: params.reason ?? ctx?.changeReason,
    });
    await this.auditRepo.save(entry);
  }

  /**
   * Lấy lịch sử thay đổi theo entity.
   */
  async findByEntity(
    entityName: string,
    entityId: string,
  ): Promise<AuditLog[]> {
    return this.auditRepo.find({
      where: { entity_name: entityName, entity_id: entityId },
      order: { created_at: 'DESC' },
      take: 50,
    });
  }

  /**
   * Diffing logic — chỉ lưu trường thực sự thay đổi.
   */
  private diff(
    oldData: Record<string, unknown>,
    newData: Record<string, unknown>,
  ): Record<string, { old: unknown; new: unknown }> | null {
    const changes: Record<string, { old: unknown; new: unknown }> = {};
    const skipKeys = [
      'updated_at',
      'created_at',
      'deleted_at',
      'password_hash',
      'password_history',
    ];

    for (const key of Object.keys(newData)) {
      if (skipKeys.includes(key)) continue;
      const oldVal = oldData[key];
      const newVal = newData[key];

      // So sánh giá trị (stringify cho object/array)
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes[key] = { old: oldVal ?? null, new: newVal ?? null };
      }
    }

    return Object.keys(changes).length > 0 ? changes : null;
  }
}
