import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  STATUS_CHANGE = 'STATUS_CHANGE',
}

@Entity('audit_logs')
@Index('idx_audit_entity', ['entity_name', 'entity_id'])
@Index('idx_audit_actor', ['actor_id'])
@Index('idx_audit_created', ['created_at'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 30 })
  action: AuditAction;

  @Column({ type: 'varchar', length: 100 })
  entity_name: string;

  @Column({ type: 'varchar', length: 100 })
  entity_id: string;

  @Column({ type: 'jsonb', nullable: true })
  old_data: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  new_data: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  changes: Record<string, { old: unknown; new: unknown }>;

  @Column({ type: 'varchar', nullable: true })
  actor_id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  actor_name: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_address: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  user_agent: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  reason: string;

  @CreateDateColumn()
  created_at: Date;
}
