import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { QuoteStatus } from '../enums/sales.enum';
import { Customer } from '../../customers/entities/customer.entity';
import { SalesQuoteLine } from './sales-quote-line.entity';

@Entity('sales_quotes')
@Index(['customer_id', 'status'])
@Index(['status', 'expiry_date'])
export class SalesQuote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 50 })
  quote_number: string; // QT-YYMMDD-XXX

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column()
  customer_id: string;

  @Column({ type: 'enum', enum: QuoteStatus, default: QuoteStatus.DRAFT })
  status: QuoteStatus;

  @Column({ type: 'date' })
  effective_date: string;

  @Column({ type: 'date' })
  expiry_date: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total_subtotal: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total_discount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total_tax: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  grand_total: number;

  @Column({ nullable: true })
  converted_to_so_id: string;

  @Column({ nullable: true })
  sales_rep_id: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => SalesQuoteLine, (line) => line.quote, { cascade: true })
  lines: SalesQuoteLine[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
