import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OfficeTaskStatus } from '../enums/office-task.enum';
import { OfficeTaskItem } from './office-task-item.entity';

@Entity('office_tasks')
@Index('IDX_OT_PROJECT_STATUS', ['project_id', 'status'])
@Index('IDX_OT_ASSIGNEE_STATUS', ['assignee_id', 'status'])
export class OfficeTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'uuid' })
  project_id: string;

  // Loose FK sang work_items.id (polymorphic)
  @Column({ type: 'uuid', nullable: true })
  work_item_id: string | null;

  @Column({ type: 'uuid' })
  assignee_id: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  due_date: Date | null;

  @Column({
    type: 'enum',
    enum: OfficeTaskStatus,
    default: OfficeTaskStatus.NEW,
  })
  status: OfficeTaskStatus;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  attachments: string[]; // Cloudinary URLs

  @Column({ type: 'timestamp with time zone', nullable: true })
  completed_at: Date | null;

  @OneToMany(() => OfficeTaskItem, (i) => i.task, { cascade: true })
  items: OfficeTaskItem[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}
