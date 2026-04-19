import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ChecklistInstanceStatus } from '../enums/checklist.enum';
import { ChecklistTemplate } from './checklist-template.entity';
import { ChecklistItemResult } from './checklist-item-result.entity';

@Entity('checklist_instances')
@Index('IDX_CI_WORK_ITEM', ['work_item_id'])
@Index('IDX_CI_ASSIGNEE_STATUS', ['assignee_id', 'status'])
export class ChecklistInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  template_id: string;

  @ManyToOne(() => ChecklistTemplate, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'template_id' })
  template: ChecklistTemplate;

  // Loose FK sang work_items.id (không hard FK theo SA_DESIGN §4.3)
  @Column({ type: 'uuid', nullable: true })
  work_item_id: string | null;

  @Column({ type: 'uuid' })
  assignee_id: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  due_date: Date | null;

  @Column({
    type: 'enum',
    enum: ChecklistInstanceStatus,
    default: ChecklistInstanceStatus.NEW,
  })
  status: ChecklistInstanceStatus;

  @Column({ type: 'timestamp with time zone', nullable: true })
  completed_at: Date | null;

  @OneToMany(() => ChecklistItemResult, (r) => r.instance)
  results: ChecklistItemResult[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}
