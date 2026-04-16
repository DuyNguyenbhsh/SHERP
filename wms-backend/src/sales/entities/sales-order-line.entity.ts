import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SalesOrder } from './sales-order.entity';

@Entity('sales_order_lines')
export class SalesOrderLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SalesOrder, (o) => o.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sales_order_id' })
  order: SalesOrder;

  @Column()
  sales_order_id: string;

  @Column()
  product_id: string;

  @Column({ type: 'int' })
  qty: number;

  @Column({ type: 'int', default: 0 })
  qty_fulfilled: number;

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
