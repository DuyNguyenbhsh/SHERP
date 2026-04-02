import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { ProjectPlan } from './project-plan.entity';

@Entity('plan_notifications')
export class PlanNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ProjectPlan, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan: ProjectPlan;

  @Column()
  plan_id: string;

  @Column()
  project_id: string;

  /** Người nhận thông báo (user ID) */
  @Column()
  recipient_id: string;

  @Column({ length: 100, nullable: true })
  recipient_name: string;

  /** Loại thông báo */
  @Column({ length: 50 })
  notification_type: string; // PLAN_SUBMITTED, PLAN_APPROVED, PLAN_REJECTED, PLAN_NEEDS_REVIEW

  /** Tiêu đề */
  @Column({ length: 255 })
  title: string;

  /** Nội dung */
  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ default: false })
  is_read: boolean;

  @CreateDateColumn()
  created_at: Date;
}
