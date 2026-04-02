import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { GoodsReceiptNote } from './goods-receipt-note.entity';

@Entity('goods_receipt_lines')
export class GoodsReceiptLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => GoodsReceiptNote, (grn) => grn.lines, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'grn_id' })
  grn: GoodsReceiptNote;

  @Column()
  po_line_id: string; // Link về dòng PO để Kế toán đối chiếu (3-way matching)

  @Column({ type: 'int' })
  received_qty: number;
}
