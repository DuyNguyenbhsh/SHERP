import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OfficeTask } from './office-task.entity';

@Entity('office_task_items')
@Index('IDX_OTI_TASK_ORDER', ['task_id', 'display_order'])
export class OfficeTaskItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  task_id: string;

  @ManyToOne(() => OfficeTask, (t) => t.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: OfficeTask;

  @Column({ type: 'int' })
  display_order: number;

  @Column({ type: 'varchar', length: 500 })
  content: string;

  @Column({ type: 'boolean', default: false })
  is_done: boolean;

  @Column({ type: 'uuid', nullable: true })
  completed_by: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  completed_at: Date | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;
}
