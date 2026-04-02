import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ApprovalConfigStep } from './approval-config-step.entity';

@Entity('approval_configs')
export class ApprovalConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Scope: tổ chức cụ thể, null = toàn cục
  @Column({ nullable: true })
  organization_id: string;

  // Loại đối tượng cần phê duyệt
  @Column({ length: 50 })
  entity_type: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Module nghiệp vụ: PROCUREMENT, PROJECT, WMS, HCM...
  @Column({ length: 50, nullable: true })
  module_code: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  // Điều kiện kích hoạt: { min_amount: 1000000000 }
  @Column({ type: 'jsonb', nullable: true })
  conditions: Record<string, unknown>;

  @OneToMany(() => ApprovalConfigStep, (s) => s.config, { cascade: true })
  steps: ApprovalConfigStep[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
