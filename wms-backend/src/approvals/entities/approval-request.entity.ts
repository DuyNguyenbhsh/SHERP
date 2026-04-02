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
import { ApprovalConfig } from './approval-config.entity';
import { ApprovalStep } from './approval-step.entity';
import { ApprovalRequestStatus } from '../enums/approval.enum';

@Entity('approval_requests')
export class ApprovalRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ApprovalConfig, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'config_id' })
  config: ApprovalConfig;

  @Column()
  config_id: string;

  @Column({ length: 50 })
  entity_type: string;

  // UUID đối tượng cần phê duyệt (project, outbound...)
  @Column()
  entity_id: string;

  @Column({
    type: 'varchar',
    length: 30,
    default: ApprovalRequestStatus.PENDING,
  })
  status: ApprovalRequestStatus;

  // Người yêu cầu
  @Column()
  requested_by: string;

  // Snapshot dữ liệu thay đổi: { field: 'budget', old: X, new: Y }
  @Column({ type: 'jsonb' })
  request_data: Record<string, unknown>;

  @Column({ type: 'int', default: 1 })
  current_step: number;

  @Column({ type: 'timestamp', nullable: true })
  resolved_at: Date;

  @OneToMany(() => ApprovalStep, (s) => s.request, { cascade: true })
  steps: ApprovalStep[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
