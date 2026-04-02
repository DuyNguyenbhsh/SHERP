import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { ScheduleApprovalStatus } from '../enums/schedule.enum';

@Entity('schedule_baselines')
export class ScheduleBaseline {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  project_id: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ length: 255 })
  title: string;

  /** Snapshot toàn bộ tasks + links tại thời điểm freeze — JSONB */
  @Column({ type: 'jsonb' })
  snapshot_data: {
    tasks: Record<string, unknown>[];
    links: Record<string, unknown>[];
    project_end_date: string | null;
    critical_path_ids: string[];
    total_duration_days: number;
  };

  @Column({
    type: 'varchar',
    length: 20,
    default: ScheduleApprovalStatus.DRAFT,
  })
  status: ScheduleApprovalStatus;

  /** Read-only vĩnh viễn sau approve */
  @Column({ type: 'timestamp', nullable: true })
  frozen_at: Date | null;

  @Column()
  created_by: string;

  @Column({ length: 100, nullable: true })
  created_by_name: string;

  @Column({ nullable: true })
  approved_by: string;

  @Column({ length: 100, nullable: true })
  approved_by_name: string;

  @CreateDateColumn()
  created_at: Date;
}
