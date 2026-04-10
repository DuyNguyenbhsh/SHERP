import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ProjectRequestStatus } from '../enums/request-status.enum';
import { WorkflowLog } from './workflow-log.entity';
import { RequestAttachment } from './request-attachment.entity';

@Entity('project_requests')
export class ProjectRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Mã yêu cầu: YC-YYMMDD-001 */
  @Column({ unique: true, length: 30 })
  request_code: string;

  /** Tiêu đề tờ trình */
  @Column({ length: 255 })
  title: string;

  /** Mô tả chi tiết / Nội dung tờ trình */
  @Column({ type: 'text', nullable: true })
  description: string;

  // ── Thông tin dự án đề xuất ──

  @Column({ length: 50 })
  proposed_project_code: string;

  @Column({ length: 255 })
  proposed_project_name: string;

  @Column({ length: 255, nullable: true })
  location: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  gfa_m2: number;

  @Column({ type: 'decimal', precision: 18, scale: 0, nullable: true })
  budget: number;

  /** Mã chủ đầu tư (Supplier) — loose FK */
  @Column({ nullable: true })
  investor_id: string;

  /** Mã GĐDA (Employee) — loose FK */
  @Column({ nullable: true })
  manager_id: string;

  /** Mã phòng ban quản lý (Organization) — loose FK */
  @Column({ nullable: true })
  department_id: string;

  /** Giai đoạn đề xuất */
  @Column({ length: 30, default: 'PLANNING' })
  proposed_stage: string;

  // ── Workflow fields ──

  @Column({
    type: 'varchar',
    length: 30,
    default: ProjectRequestStatus.DRAFT,
  })
  status: ProjectRequestStatus;

  /** Người tạo yêu cầu (user ID) */
  @Column()
  created_by: string;

  /** Tên người tạo (denormalized for display) */
  @Column({ length: 100, nullable: true })
  created_by_name: string;

  /** ID project được tạo sau khi DEPLOYED */
  @Column({ nullable: true })
  deployed_project_id: string;

  /** Lý do từ chối (nếu bị reject) */
  @Column({ type: 'text', nullable: true })
  rejection_reason: string;

  /** Trạng thái trước khi chuyển sang PENDING_INFO — để biết gửi lại về bước nào */
  @Column({ length: 30, nullable: true })
  pending_return_status: string;

  // ── Relations ──

  @OneToMany(() => WorkflowLog, (log) => log.request, { cascade: true })
  workflow_logs: WorkflowLog[];

  @OneToMany(() => RequestAttachment, (att) => att.request, { cascade: true })
  attachments: RequestAttachment[];

  // ── Timestamps ──

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
