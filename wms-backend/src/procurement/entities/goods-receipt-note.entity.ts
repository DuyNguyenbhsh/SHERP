import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { PurchaseOrder } from './purchase-order.entity';
import { GoodsReceiptLine } from './goods-receipt-line.entity';

@Entity('goods_receipt_notes')
export class GoodsReceiptNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  grn_number: string; // VD: GRN-260221-001

  @ManyToOne(() => PurchaseOrder, (po) => po.grns)
  @JoinColumn({ name: 'po_id' })
  po: PurchaseOrder;

  @Column({ nullable: true })
  received_by: string; // ID nhân viên kho quét mã

  @OneToMany(() => GoodsReceiptLine, (line) => line.grn, { cascade: true })
  lines: GoodsReceiptLine[];

  @CreateDateColumn()
  receipt_date: Date;
}
