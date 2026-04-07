import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { Project } from './project.entity';
import { Employee } from '../../users/entities/employee.entity';

@Entity('subcontractor_kpis')
export class SubcontractorKpi {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Supplier, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Index()
  @Column()
  supplier_id: string;

  @ManyToOne(() => Project, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ nullable: true })
  project_id: string;

  @Column({ length: 20, nullable: true })
  evaluation_period: string;

  @Column({ type: 'date' })
  evaluation_date: Date;

  @Column({ type: 'jsonb' })
  criteria: {
    name: string;
    weight: number;
    score: number;
    max_score: number;
  }[];

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  total_score: number;

  @Column({ type: 'varchar', length: 10 })
  result: 'PASS' | 'FAIL';

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by' })
  approver: Employee;

  @Column({ nullable: true })
  approved_by: string;

  @Column({ type: 'timestamp', nullable: true })
  approved_at: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
