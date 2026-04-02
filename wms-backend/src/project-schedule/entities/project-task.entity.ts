import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { TaskStatus } from '../enums/schedule.enum';

@Entity('project_tasks')
@Index('idx_pt_project', ['project_id'])
export class ProjectTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  project_id: string;

  /** Liên kết WBS (optional — task có thể map tới WBS node) */
  @Column({ nullable: true })
  wbs_id: string;

  /** Mã task: T-001, T-002 */
  @Column({ length: 30 })
  task_code: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  /** Thời gian thi công (ngày) */
  @Column({ type: 'int', default: 1 })
  duration_days: number;

  /** Ngày bắt đầu kế hoạch (tính bởi CPM hoặc nhập tay) */
  @Column({ type: 'date', nullable: true })
  start_date: Date | null;

  /** Ngày kết thúc kế hoạch (tính bởi CPM) */
  @Column({ type: 'date', nullable: true })
  end_date: Date | null;

  /** Ngày bắt đầu thực tế */
  @Column({ type: 'date', nullable: true })
  actual_start: Date | null;

  /** Ngày kết thúc thực tế */
  @Column({ type: 'date', nullable: true })
  actual_end: Date | null;

  /** % hoàn thành */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  progress_percent: number;

  @Column({ type: 'varchar', length: 20, default: TaskStatus.NOT_STARTED })
  status: TaskStatus;

  // ── CPM Fields (computed by engine) ──

  /** Early Start — sớm nhất có thể bắt đầu */
  @Column({ type: 'int', nullable: true })
  early_start: number | null;

  /** Early Finish = ES + duration */
  @Column({ type: 'int', nullable: true })
  early_finish: number | null;

  /** Late Start — muộn nhất có thể bắt đầu mà không trễ dự án */
  @Column({ type: 'int', nullable: true })
  late_start: number | null;

  /** Late Finish */
  @Column({ type: 'int', nullable: true })
  late_finish: number | null;

  /** Total Float = LS - ES. Nếu = 0 → Critical Path */
  @Column({ type: 'int', nullable: true })
  total_float: number | null;

  /** Task thuộc Đường Găng? */
  @Column({ type: 'boolean', default: false })
  is_critical: boolean;

  // ── Nguồn lực ──

  /** Số nhân công dự kiến */
  @Column({ type: 'int', default: 0 })
  planned_labor: number;

  /** Mô tả nguồn lực (máy móc, thiết bị...) */
  @Column({ type: 'text', nullable: true })
  resource_notes: string;

  /** Thứ tự sắp xếp */
  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
