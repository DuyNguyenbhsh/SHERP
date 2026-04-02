import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Project } from './project.entity';

@Entity('project_boq_imports')
export class ProjectBoqImport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column()
  project_id: string;

  @Column({ length: 255 })
  file_name: string;

  @Column({ type: 'int', default: 0 })
  total_rows: number;

  @Column({ type: 'int', default: 0 })
  success_rows: number;

  @Column({ type: 'int', default: 0 })
  error_rows: number;

  // Chi tiết lỗi: [{ row, field, message }]
  @Column({ type: 'jsonb', nullable: true })
  errors: { row: number; field: string; message: string }[];

  @Column({ nullable: true })
  imported_by: string;

  @CreateDateColumn()
  imported_at: Date;
}
