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
import { WorkItemType } from '../../work-items/enums/work-item.enum';
import { WbsNode } from './wbs-node.entity';

@Entity('task_templates')
@Index('IDX_TT_NODE', ['wbs_node_id'])
@Index('IDX_TT_ACTIVE_TYPE', ['is_active', 'work_item_type'])
export class TaskTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  wbs_node_id: string;

  @ManyToOne(() => WbsNode, (n) => n.task_templates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wbs_node_id' })
  wbs_node: WbsNode;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'enum', enum: WorkItemType })
  work_item_type: WorkItemType;

  // RFC 5545 RRULE, parse bằng `rrule-parser.logic.ts`
  @Column({ type: 'varchar', length: 200 })
  recurrence_rule: string;

  @Column({ type: 'int', default: 24 })
  sla_hours: number;

  // Link tới template cụ thể của module con (ChecklistTemplate, ...)
  @Column({ type: 'uuid', nullable: true })
  template_ref_id: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  default_assignee_role: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'date', nullable: true })
  last_generated_date: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}
