import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { ProjectBudget } from './project-budget.entity';
import { BudgetPeriod } from './budget-period.entity';
import {
  BudgetTransactionType,
  BudgetAmountType,
  BudgetCheckResult,
} from '../enums/budget.enum';

@Entity('budget_transaction_logs')
export class BudgetTransactionLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ProjectBudget, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'budget_id' })
  budget: ProjectBudget;

  @Column()
  budget_id: string;

  @ManyToOne(() => BudgetPeriod, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'budget_period_id' })
  budget_period: BudgetPeriod;

  @Column({ nullable: true })
  budget_period_id: string;

  @Column({ length: 30 })
  transaction_type: BudgetTransactionType;

  @Column({ nullable: true })
  transaction_id: string;

  @Column({ length: 100, nullable: true })
  transaction_ref: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ length: 10 })
  amount_type: BudgetAmountType;

  @Column({ length: 10 })
  check_result: BudgetCheckResult;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  available_before: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  available_after: number;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string;

  @Column({ nullable: true })
  override_by: string;

  @Column({ type: 'text', nullable: true })
  override_reason: string;

  @Column({ nullable: true })
  created_by: string;

  @CreateDateColumn()
  created_at: Date;
}
