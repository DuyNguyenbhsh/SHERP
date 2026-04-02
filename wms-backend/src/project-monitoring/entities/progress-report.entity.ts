import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ReportStatus } from '../enums/monitoring.enum';

@Entity('project_progress_reports')
export class ProgressReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  project_id: string;

  /** Kỳ báo cáo: 'W01-2026', 'M03-2026' */
  @Column({ length: 30 })
  report_period: string;

  /** Ngày báo cáo */
  @Column({ type: 'date' })
  report_date: Date;

  /** Mô tả tổng quan tiến độ */
  @Column({ type: 'text', nullable: true })
  summary: string;

  /**
   * Chi tiết tiến độ từng WBS — JSONB array:
   * [{ wbs_id, wbs_code, wbs_name, planned_percent, actual_percent, notes }]
   */
  @Column({ type: 'jsonb', nullable: true })
  wbs_progress:
    | {
        wbs_id: string;
        wbs_code: string;
        wbs_name: string;
        planned_percent: number;
        actual_percent: number;
        notes?: string;
      }[]
    | null;

  /**
   * BẮT BUỘC: Ảnh chụp hiện trường / Biên bản xác nhận sản lượng.
   * JSONB array of URLs/paths. Không được trống khi SUBMIT.
   */
  @Column({ type: 'jsonb', nullable: true })
  evidence_attachments: string[] | null;

  /** Mô tả bằng chứng đính kèm */
  @Column({ type: 'text', nullable: true })
  evidence_notes: string;

  // ── EVM Snapshot tại thời điểm báo cáo ──

  /** % hoàn thành tổng thể dự án (tính từ WBS weighted avg) */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  overall_progress: number;

  /** Earned Value tại thời điểm báo cáo */
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  earned_value: number;

  /** Actual Cost tại thời điểm báo cáo (từ WMS + transactions) */
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  actual_cost: number;

  /** Planned Value (from baseline) */
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  planned_value: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  spi: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  cpi: number;

  // ── Workflow ──

  @Column({ type: 'varchar', length: 20, default: ReportStatus.DRAFT })
  status: ReportStatus;

  @Column()
  created_by: string;

  @Column({ length: 100, nullable: true })
  created_by_name: string;

  @Column({ nullable: true })
  approved_by: string;

  @Column({ length: 100, nullable: true })
  approved_by_name: string;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
