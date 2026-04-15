import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('document_audit_logs')
@Index('IDX_DOCAUDIT_ENTITY', ['entity_type', 'entity_id'])
@Index('IDX_DOCAUDIT_ACTOR', ['actor_id'])
export class DocumentAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  entity_type: string;

  @Column({ type: 'uuid' })
  entity_id: string;

  @Column({ type: 'varchar', length: 50 })
  action: string;

  @Column({ type: 'uuid', nullable: true })
  actor_id: string | null;

  @Column({ type: 'jsonb', nullable: true })
  old_data: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  new_data: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip: string | null;

  @Column({ type: 'text', nullable: true })
  user_agent: string | null;

  @CreateDateColumn()
  created_at: Date;
}
