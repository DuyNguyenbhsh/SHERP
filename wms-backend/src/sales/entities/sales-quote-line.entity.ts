import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SalesQuote } from './sales-quote.entity';

@Entity('sales_quote_lines')
export class SalesQuoteLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SalesQuote, (q) => q.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quote_id' })
  quote: SalesQuote;

  @Column()
  quote_id: string;

  @Column()
  product_id: string;

  @Column({ type: 'int' })
  qty: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  unit_price: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  discount_percent: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 10 })
  tax_percent: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  line_subtotal: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  line_discount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  line_tax: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  line_total: number;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
