import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WorkItemStatus, WorkItemType } from '../enums/work-item.enum';

@Entity('work_items')
@Index('IDX_WI_PROJECT_DUE_STATUS', ['project_id', 'due_date', 'status'])
@Index('IDX_WI_ASSIGNEE_STATUS', ['assignee_id', 'status'])
@Index('IDX_WI_DEDUP', ['task_template_id', 'scheduled_at'], {
  unique: true,
  where: '"task_template_id" IS NOT NULL',
})
export class WorkItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: WorkItemType })
  work_item_type: WorkItemType;

  // Loose FK (UUID string) → row cụ thể trong bảng con (checklist_instances, incidents, ...)
  @Column({ type: 'uuid', nullable: true })
  subject_id: string | null;

  @Column({ type: 'uuid' })
  project_id: string;

  @Column({ type: 'uuid', nullable: true })
  assignee_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  task_template_id: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  scheduled_at: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  due_date: Date | null;

  @Column({ type: 'enum', enum: WorkItemStatus, default: WorkItemStatus.NEW })
  status: WorkItemStatus;

  @Column({ type: 'smallint', default: 0 })
  progress_pct: number;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'uuid', nullable: true })
  parent_id: string | null;

  @ManyToOne(() => WorkItem, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_id' })
  parent: WorkItem | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}
