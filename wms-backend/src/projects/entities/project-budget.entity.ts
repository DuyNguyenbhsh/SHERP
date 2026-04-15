import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from './project.entity';
import { CostCategory } from './cost-category.entity';
import {
  BudgetType,
  BudgetControlLevel,
  BudgetStatus,
} from '../enums/budget.enum';

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

  @Column({ length: 50, nullable: true, unique: true })
  budget_code: string;

  @Column({ length: 255, nullable: true })
  budget_name: string;

  @Column({ type: 'int', default: 2026 })
  fiscal_year: number;

  @Column({ length: 10, default: BudgetType.OPEX })
  budget_type: BudgetType;

  @Column({ length: 10, default: BudgetControlLevel.HARD })
  control_level: BudgetControlLevel;

  @Column({ length: 20, default: BudgetStatus.DRAFT })
  status: BudgetStatus;

  @Column({ type: 'boolean', default: false })
  allow_carry_forward: boolean;

  @Column({ type: 'smallint', default: 90 })
  warning_threshold_pct: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  planned_amount: number;

  @Column({ length: 10, default: 'VND' })
  currency: string;

  @Column({ nullable: true })
  department_id: string;

  @Column({ nullable: true })
  wbs_element_id: string;

  @Column({ nullable: true })
  approved_by: string;

  @Column({ type: 'timestamp', nullable: true })
  approved_at: Date;

  @Column({ nullable: true })
  created_by: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
