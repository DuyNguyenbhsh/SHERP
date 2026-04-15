import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  CreateDateColumn,
} from 'typeorm';
import { ProjectBudget } from './project-budget.entity';
import { BudgetRevisionStatus } from '../enums/budget.enum';

@Entity('budget_revisions')
@Unique(['budget_id', 'revision_number'])
export class BudgetRevision {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ProjectBudget, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'budget_id' })
  budget: ProjectBudget;

  @Column()
  budget_id: string;

  @Column({ type: 'int' })
  revision_number: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  previous_amount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  revised_amount: number;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ nullable: true })
  requested_by: string;

  @Column({ nullable: true })
  approved_by: string;

  @Column({ length: 10, default: BudgetRevisionStatus.PENDING })
  status: BudgetRevisionStatus;

  @CreateDateColumn()
  created_at: Date;
}
