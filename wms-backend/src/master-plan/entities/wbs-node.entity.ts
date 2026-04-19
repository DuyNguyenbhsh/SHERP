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
import { WbsNodeType } from '../enums/master-plan.enum';
import { MasterPlan } from './master-plan.entity';
import { TaskTemplate } from './task-template.entity';

@Entity('wbs_nodes')
@Index('IDX_WBS_PLAN_CODE', ['plan_id', 'wbs_code'], { unique: true })
@Index('IDX_WBS_PARENT', ['parent_id'])
export class WbsNode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  plan_id: string;

  @ManyToOne(() => MasterPlan, (p) => p.wbs_nodes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  master_plan: MasterPlan;

  @Column({ type: 'uuid', nullable: true })
  parent_id: string | null;

  @ManyToOne(() => WbsNode, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_id' })
  parent: WbsNode | null;

  @Column({ type: 'varchar', length: 20 })
  wbs_code: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'smallint' })
  level: number;

  @Column({ type: 'enum', enum: WbsNodeType })
  node_type: WbsNodeType;

  @Column({ type: 'bigint', default: 0 })
  budget_vnd: string;

  @Column({ type: 'date', nullable: true })
  start_date: string | null;

  @Column({ type: 'date', nullable: true })
  end_date: string | null;

  @Column({ type: 'uuid', nullable: true })
  responsible_employee_id: string | null;

  @Column({ type: 'boolean', default: false })
  is_archived: boolean;

  @OneToMany(() => TaskTemplate, (t) => t.wbs_node)
  task_templates: TaskTemplate[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}
