import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { PlanStatus } from '../enums/plan-status.enum';

@Entity('project_plans')
export class ProjectPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** FK dự án — loose coupling (không hard FK để tránh circular) */
  @Column()
  project_id: string;

  /** Số phiên bản: 1, 2, 3... Khi reject → clone version++ */
  @Column({ type: 'int', default: 1 })
  version: number;

  /** Tiêu đề kế hoạch */
  @Column({ length: 255 })
  title: string;

  /** Mô tả / Nội dung kế hoạch thi công */
  @Column({ type: 'text', nullable: true })
  description: string;

  /** Ngày bắt đầu kế hoạch */
  @Column({ type: 'date', nullable: true })
  planned_start: Date | null;

  /** Ngày kết thúc kế hoạch */
  @Column({ type: 'date', nullable: true })
  planned_end: Date | null;

  /** Tổng ngân sách kế hoạch */
  @Column({ type: 'decimal', precision: 18, scale: 0, nullable: true })
  total_budget: number | null;

  /** Dữ liệu kế hoạch chi tiết (WBS snapshot, milestones, ...) — JSONB */
  @Column({ type: 'jsonb', nullable: true })
  plan_data: Record<string, unknown> | null;

  /** Danh sách file đính kèm (paths/URLs) — JSONB */
  @Column({ type: 'jsonb', nullable: true })
  attachments: string[] | null;

  // ── Workflow ──

  @Column({ type: 'varchar', length: 20, default: PlanStatus.DRAFT })
  status: PlanStatus;

  /** Đây có phải Baseline chính thức không? (Chỉ 1 plan/project được = true) */
  @Column({ type: 'boolean', default: false })
  is_baseline: boolean;

  /**
   * Thời điểm phê duyệt (freeze). Sau mốc này, entity trở thành IMMUTABLE.
   * Tất cả UPDATE/DELETE sẽ bị từ chối kể cả Admin.
   */
  @Column({ type: 'timestamp', nullable: true })
  frozen_at: Date | null;

  /** Người tạo kế hoạch */
  @Column()
  created_by: string;

  @Column({ length: 100, nullable: true })
  created_by_name: string;

  /** Người trình duyệt */
  @Column({ nullable: true })
  submitted_by: string;

  @Column({ length: 100, nullable: true })
  submitted_by_name: string;

  /** Người xem xét (PM) */
  @Column({ nullable: true })
  reviewed_by: string;

  @Column({ length: 100, nullable: true })
  reviewed_by_name: string;

  /** Người phê duyệt cuối */
  @Column({ nullable: true })
  approved_by: string;

  @Column({ length: 100, nullable: true })
  approved_by_name: string;

  /** Lý do từ chối */
  @Column({ type: 'text', nullable: true })
  rejection_reason: string;

  /** ID phiên bản trước (nếu clone từ bản bị reject) */
  @Column({ nullable: true })
  previous_version_id: string;

  // ── Relations ──

  @OneToMany(() => PlanApprovalLog, (log) => log.plan, { cascade: true })
  approval_logs: PlanApprovalLog[];

  // ── Timestamps ──

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

/**
 * Log từng bước phê duyệt kế hoạch
 */
@Entity('plan_approval_logs')
export class PlanApprovalLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ProjectPlan, (p) => p.approval_logs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan: ProjectPlan;

  @Column()
  plan_id: string;

  @Column({ length: 20 })
  from_status: string;

  @Column({ length: 20 })
  to_status: string;

  @Column({ length: 30 })
  action: string;

  @Column()
  acted_by: string;

  @Column({ length: 100, nullable: true })
  acted_by_name: string;

  @Column({ length: 50, nullable: true })
  actor_role: string;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @CreateDateColumn()
  acted_at: Date;
}
