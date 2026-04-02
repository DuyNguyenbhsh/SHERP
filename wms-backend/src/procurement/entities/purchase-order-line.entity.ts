import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PurchaseOrder } from './purchase-order.entity';

@Entity('purchase_order_lines')
export class PurchaseOrderLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PurchaseOrder, (po) => po.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'po_id' })
  po: PurchaseOrder;

  @Column()
  product_id: string; // Tạm dùng string, link với bảng Products sau

  @Column({ type: 'int' })
  order_qty: number;

  @Column({ type: 'int', default: 0 })
  received_qty: number; // Tự động tăng khi kho quét mã nhận hàng

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  unit_price: number;
}
