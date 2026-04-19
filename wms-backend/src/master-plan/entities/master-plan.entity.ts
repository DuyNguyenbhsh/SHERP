import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { MasterPlanStatus } from '../enums/master-plan.enum';
import { WbsNode } from './wbs-node.entity';

@Entity('master_plans')
@Index('IDX_MP_PROJECT_YEAR', ['project_id', 'year'], { unique: true })
export class MasterPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 40, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'int' })
  year: number;

  // Loose FK (UUID only) — xem dev-rules §4.3 loose coupling
  @Column({ type: 'uuid' })
  project_id: string;

  @Column({ type: 'bigint', default: 0 })
  budget_vnd: string;

  @Column({
    type: 'enum',
    enum: MasterPlanStatus,
    default: MasterPlanStatus.DRAFT,
  })
  status: MasterPlanStatus;

  @Column({ type: 'date', nullable: true })
  start_date: string | null;

  @Column({ type: 'date', nullable: true })
  end_date: string | null;

  @Column({ type: 'uuid', nullable: true })
  approved_by: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  approved_at: Date | null;

  @OneToMany(() => WbsNode, (n) => n.master_plan)
  wbs_nodes: WbsNode[];

  @VersionColumn({ type: 'int', default: 1 })
  version: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}
