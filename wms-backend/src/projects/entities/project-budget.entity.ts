import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Project } from './project.entity';
import { CostCategory } from './cost-category.entity';

@Entity('project_budgets')
@Unique(['project_id', 'category_id'])
export class ProjectBudget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column()
  project_id: string;

  @ManyToOne(() => CostCategory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category: CostCategory;

  @Column()
  category_id: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  planned_amount: number;

  @Column({ length: 10, default: 'VND' })
  currency: string;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
