import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { Project } from './project.entity';
import { ProjectWbs } from './project-wbs.entity';
import { CostCategory } from './cost-category.entity';

@Entity('project_cbs')
@Unique(['project_id', 'wbs_id', 'category_id'])
export class ProjectCbs {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column()
  project_id: string;

  @ManyToOne(() => ProjectWbs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wbs_id' })
  wbs: ProjectWbs;

  @Column()
  wbs_id: string;

  @ManyToOne(() => CostCategory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category: CostCategory;

  @Column()
  category_id: string;

  // Ngân sách phân bổ cho WBS+category
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  planned_amount: number;

  @Column({ length: 10, default: 'VND' })
  currency: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
