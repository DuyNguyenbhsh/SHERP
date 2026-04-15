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
import { ProjectBudget } from './project-budget.entity';

@Entity('budget_periods')
@Unique(['budget_id', 'period_name'])
export class BudgetPeriod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ProjectBudget, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'budget_id' })
  budget: ProjectBudget;

  @Column()
  budget_id: string;

  @Column({ length: 20 })
  period_name: string; // "2026-Q1", "2026-03"

  @Column({ type: 'date' })
  period_start: Date;

  @Column({ type: 'date' })
  period_end: Date;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  period_amount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  consumed_amount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  committed_amount: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
