import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentAuditLog } from '../entities/document-audit-log.entity';
import { DocumentAuditAction } from '../enums/document.enum';

export interface AuditContext {
  entity_type: 'DOCUMENT' | 'DOCUMENT_VERSION';
  entity_id: string;
  action: DocumentAuditAction;
  actor_id?: string | null;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  ip?: string | null;
  user_agent?: string | null;
}

@Injectable()
export class DocumentAuditService {
  private readonly logger = new Logger(DocumentAuditService.name);

  constructor(
    @InjectRepository(DocumentAuditLog)
    private readonly auditRepo: Repository<DocumentAuditLog>,
  ) {}

  /**
   * Ghi audit log BẤT ĐỒNG BỘ — không block API response (BR-DOC-14).
   */
  log(ctx: AuditContext): void {
    setImmediate(() => {
      const entity = this.auditRepo.create({
        entity_type: ctx.entity_type,
        entity_id: ctx.entity_id,
        action: ctx.action,
        actor_id: ctx.actor_id ?? null,
        old_data: ctx.old_data ?? null,
        new_data: ctx.new_data ?? null,
        ip: ctx.ip ?? null,
        user_agent: ctx.user_agent ?? null,
      });
      this.auditRepo
        .save(entity)
        .catch((err: unknown) =>
          this.logger.error(
            `Audit log thất bại (action=${ctx.action}, entity=${ctx.entity_id}): ${err instanceof Error ? err.message : String(err)}`,
          ),
        );
    });
  }

  async findByEntity(
    entityType: 'DOCUMENT' | 'DOCUMENT_VERSION',
    entityId: string,
    limit = 100,
  ): Promise<DocumentAuditLog[]> {
    return this.auditRepo.find({
      where: { entity_type: entityType, entity_id: entityId },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  /**
   * Aggregate audit log cho 1 document: bao gồm events của document + tất cả versions.
   */
  async findByDocumentAggregated(
    documentId: string,
    versionIds: string[],
    limit = 200,
  ): Promise<DocumentAuditLog[]> {
    const qb = this.auditRepo
      .createQueryBuilder('a')
      .where('(a.entity_type = :dt AND a.entity_id = :did)', {
        dt: 'DOCUMENT',
        did: documentId,
      });

    if (versionIds.length > 0) {
      qb.orWhere('(a.entity_type = :vt AND a.entity_id IN (:...vids))', {
        vt: 'DOCUMENT_VERSION',
        vids: versionIds,
      });
    }

    return qb.orderBy('a.created_at', 'DESC').take(limit).getMany();
  }
}
