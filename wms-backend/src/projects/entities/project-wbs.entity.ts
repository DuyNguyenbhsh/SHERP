import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { Project } from './project.entity';
import { WbsStatus } from '../enums/wbs.enum';

@Entity('project_wbs')
@Unique(['project_id', 'code'])
@Index('idx_wbs_project_id', ['project_id'])
@Index('idx_wbs_parent_id', ['parent_id'])
export class ProjectWbs {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column()
  project_id: string;

  // Self-referential: cấu trúc cây (Parent-Child)
  @ManyToOne(() => ProjectWbs, (wbs) => wbs.children, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parent_id' })
  parent: ProjectWbs;

  @Column({ nullable: true })
  parent_id: string;

  @OneToMany(() => ProjectWbs, (wbs) => wbs.parent)
  children: ProjectWbs[];

  // Mã WBS phân cấp: "1", "1.1", "1.1.2"
  @Column({ length: 50 })
  code: string;

  @Column({ length: 255 })
  name: string;

  // Depth level: 0 = root
  @Column({ type: 'int', default: 0 })
  level: number;

  // Materialized path cho truy vấn subtree nhanh: "root.1.1.2"
  @Column({ type: 'text', nullable: true })
  path: string;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @Column({ type: 'date', nullable: true })
  planned_start: Date;

  @Column({ type: 'date', nullable: true })
  planned_end: Date;

  @Column({ type: 'date', nullable: true })
  actual_start: Date;

  @Column({ type: 'date', nullable: true })
  actual_end: Date;

  // Trọng số cho EV calculation (% trên tổng level, tổng con = 100)
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  weight: number;

  // % hoàn thành (0.00 – 100.00)
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  progress_percent: number;

  @Column({ type: 'varchar', length: 30, default: WbsStatus.PENDING })
  status: WbsStatus;

  // Phòng ban chịu trách nhiệm
  @Column({ nullable: true })
  department_id: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
