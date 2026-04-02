import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { VOStatus, VOType } from '../enums/monitoring.enum';

@Entity('variation_orders')
export class VariationOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  project_id: string;

  /** Mã VO: VO-YYMMDD-001 */
  @Column({ unique: true, length: 30 })
  vo_code: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  /** Loại thay đổi: BUDGET, TIMELINE, SCOPE, COMBINED */
  @Column({ type: 'varchar', length: 20 })
  vo_type: VOType;

  // ── Thay đổi Ngân sách ──

  /** Ngân sách trước thay đổi */
  @Column({ type: 'decimal', precision: 18, scale: 0, nullable: true })
  budget_before: number | null;

  /** Ngân sách sau thay đổi (đề xuất) */
  @Column({ type: 'decimal', precision: 18, scale: 0, nullable: true })
  budget_after: number | null;

  /** Chênh lệch = after - before */
  @Column({ type: 'decimal', precision: 18, scale: 0, nullable: true })
  budget_delta: number | null;

  // ── Thay đổi Timeline ──

  /** Ngày kết thúc trước thay đổi */
  @Column({ type: 'date', nullable: true })
  timeline_before: Date | null;

  /** Ngày kết thúc sau thay đổi (đề xuất) */
  @Column({ type: 'date', nullable: true })
  timeline_after: Date | null;

  // ── Thay đổi Phạm vi ──

  /** Mô tả phạm vi thay đổi */
  @Column({ type: 'text', nullable: true })
  scope_description: string;

  /** File đính kèm */
  @Column({ type: 'jsonb', nullable: true })
  attachments: string[] | null;

  /** Lý do thay đổi */
  @Column({ type: 'text' })
  reason: string;

  // ── Workflow ──

  @Column({ type: 'varchar', length: 20, default: VOStatus.DRAFT })
  status: VOStatus;

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
