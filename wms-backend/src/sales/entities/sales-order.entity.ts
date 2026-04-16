import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { SalesOrderStatus, CustomerPaymentTerm } from '../enums/sales.enum';
import { Customer } from '../../customers/entities/customer.entity';
import { SalesOrderLine } from './sales-order-line.entity';

@Entity('sales_orders')
@Index(['customer_id', 'status'])
@Index(['status', 'order_date'])
export class SalesOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 50 })
  order_number: string; // SO-YYMMDD-XXX

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column()
  customer_id: string;

  @Column({ nullable: true })
  quote_id: string;

  @Column({
    type: 'enum',
    enum: SalesOrderStatus,
    default: SalesOrderStatus.CONFIRMED,
  })
  status: SalesOrderStatus;

  @Column({ nullable: true })
  outbound_order_id: string;

  @CreateDateColumn()
  order_date: Date;

  @Column({ type: 'date', nullable: true })
  required_delivery_date: string;

  @Column({ type: 'text', nullable: true })
  ship_to_address: string;

  @Column({
    type: 'enum',
    enum: CustomerPaymentTerm,
    default: CustomerPaymentTerm.COD,
  })
  payment_term: CustomerPaymentTerm;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total_subtotal: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total_discount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total_tax: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  grand_total: number;

  @Column({ default: false })
  is_credit_bypassed: boolean;

  @Column({ type: 'text', nullable: true })
  bypass_reason: string;

  @Column({ nullable: true })
  sales_rep_id: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => SalesOrderLine, (line) => line.order, { cascade: true })
  lines: SalesOrderLine[];

  @UpdateDateColumn()
  updated_at: Date;

  @VersionColumn()
  version: number;
}
