import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Project } from './project.entity';

@Entity('project_history')
@Index('idx_project_history_project_id', ['project_id'])
export class ProjectHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column()
  project_id: string;

  // Trường bị thay đổi (e.g., 'manager_id', 'department_id', 'budget', 'status')
  @Column({ length: 50 })
  field_name: string;

  // Lưu giá trị dưới dạng String để linh hoạt
  @Column({ type: 'text', nullable: true })
  old_value: string;

  @Column({ type: 'text', nullable: true })
  new_value: string;

  // Label hiển thị (VD: "Nguyễn Văn A" thay vì UUID)
  @Column({ type: 'text', nullable: true })
  old_label: string;

  @Column({ type: 'text', nullable: true })
  new_label: string;

  // Ai thực hiện thay đổi (loose FK → users.id, để tránh circular import)
  @Column({ nullable: true })
  changed_by: string;

  // Lý do thay đổi — đặc biệt quan trọng cho thay đổi Ngân sách/GDDA
  @Column({ type: 'text', nullable: true })
  change_reason: string;

  // Metadata: IP, User-Agent, context bổ sung
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  changed_at: Date;
}
