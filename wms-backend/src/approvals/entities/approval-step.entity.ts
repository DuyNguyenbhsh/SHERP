import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { ApprovalRequest } from './approval-request.entity';
import { ApprovalStepStatus } from '../enums/approval.enum';

@Entity('approval_steps')
export class ApprovalStep {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ApprovalRequest, (r) => r.steps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  request: ApprovalRequest;

  @Column()
  request_id: string;

  @Column({ type: 'int' })
  step_order: number;

  // Người phê duyệt thực tế (resolved từ config)
  @Column()
  approver_id: string;

  // Denormalized cho audit trail
  @Column({ type: 'varchar', length: 100, nullable: true })
  approver_name: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  role_code: string | null;

  // Nếu là ủy quyền, lưu ID người gốc
  @Column({ type: 'varchar', nullable: true })
  delegated_from_id: string | null;

  @Column({ type: 'varchar', length: 30, default: ApprovalStepStatus.PENDING })
  status: ApprovalStepStatus;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ type: 'timestamp', nullable: true })
  acted_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
