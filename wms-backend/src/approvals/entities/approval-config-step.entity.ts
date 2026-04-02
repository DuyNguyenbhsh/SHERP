import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { ApprovalConfig } from './approval-config.entity';

@Entity('approval_config_steps')
export class ApprovalConfigStep {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ApprovalConfig, (c) => c.steps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'config_id' })
  config: ApprovalConfig;

  @Column()
  config_id: string;

  // Thứ tự phê duyệt: 1, 2, 3...
  @Column({ type: 'int' })
  step_order: number;

  // Vai trò phê duyệt (PM, GDDA, GDTC)
  @Column({ length: 50, nullable: true })
  approver_role: string;

  // Người phê duyệt cụ thể (UUID)
  @Column({ nullable: true })
  approver_id: string;

  @Column({ type: 'boolean', default: true })
  is_required: boolean;

  // Bat buoc: true = luon phai duyet, false = co the bo qua neu ho so day du
  @Column({ type: 'boolean', default: true })
  is_mandatory: boolean;

  // Duyệt song song: số người cần duyệt ở cùng step_order (>1 = parallel)
  @Column({ type: 'int', default: 1 })
  required_count: number;

  // Ủy quyền: nếu approver chính vắng, ai duyệt thay
  @Column({ nullable: true })
  delegate_to_id: string;

  // Người thay thế tự động: nếu approver không duyệt quá timeout_hours
  @Column({ type: 'varchar', nullable: true })
  alternative_approver_id: string | null;

  // Tự động escalate sau N giờ (chuyển sang alternative_approver)
  @Column({ type: 'int', nullable: true })
  timeout_hours: number;

  @CreateDateColumn()
  created_at: Date;
}
