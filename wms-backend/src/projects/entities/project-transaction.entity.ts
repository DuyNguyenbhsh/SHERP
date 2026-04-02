import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from './project.entity';
import { CostCategory } from './cost-category.entity';

@Entity('project_transactions')
export class ProjectTransaction {
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

  @Column({ length: 50, nullable: true })
  reference_type: string; // 'WMS_EXPORT', 'PO_INVOICE', 'MANUAL'

  @Column({ length: 50, nullable: true })
  reference_id: string; // ID phiếu xuất kho, hóa đơn

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ type: 'date' })
  transaction_date: Date;

  // Liên kết WBS (EVM tracking)
  @Column({ nullable: true })
  wbs_id: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
