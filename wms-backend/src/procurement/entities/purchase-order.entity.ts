import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { PurchaseOrderLine } from './purchase-order-line.entity';
import { GoodsReceiptNote } from './goods-receipt-note.entity';
import { PoStatus } from '../enums/procurement.enum';

@Entity('purchase_orders')
export class PurchaseOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  po_number: string; // VD: PO-260221-001

  @Column()
  vendor_id: string; // Tạm dùng string, nếu có bảng Vendor thì đổi thành @ManyToOne

  @Column({ type: 'enum', enum: PoStatus, default: PoStatus.DRAFT })
  status: PoStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_amount: number;

  // Liên kết dự án (Budget control)
  @Column({ nullable: true })
  project_id: string;

  @Column({ nullable: true })
  category_id: string;

  @OneToMany(() => PurchaseOrderLine, (line) => line.po, { cascade: true })
  lines: PurchaseOrderLine[];

  @OneToMany(() => GoodsReceiptNote, (grn) => grn.po)
  grns: GoodsReceiptNote[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
