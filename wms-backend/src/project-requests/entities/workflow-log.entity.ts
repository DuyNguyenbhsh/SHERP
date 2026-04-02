import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { ProjectRequest } from './project-request.entity';

@Entity('workflow_logs')
export class WorkflowLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ProjectRequest, (r) => r.workflow_logs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'request_id' })
  request: ProjectRequest;

  @Column()
  request_id: string;

  /** Trạng thái trước */
  @Column({ length: 30 })
  from_status: string;

  /** Trạng thái sau */
  @Column({ length: 30 })
  to_status: string;

  /** Hành động: SUBMIT, APPROVE, REJECT, CANCEL, DEPLOY */
  @Column({ length: 30 })
  action: string;

  /** User thực hiện */
  @Column()
  acted_by: string;

  /** Tên user (denormalized) */
  @Column({ length: 100, nullable: true })
  acted_by_name: string;

  /** Role tại thời điểm action */
  @Column({ length: 50, nullable: true })
  actor_role: string;

  /** Ghi chú / Lý do */
  @Column({ type: 'text', nullable: true })
  comment: string;

  @CreateDateColumn()
  acted_at: Date;
}
