import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { InboundReceipt } from './inbound-receipt.entity';
import { QcStatus } from '../enums/inbound.enum';

@Entity('inbound_lines')
export class InboundLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => InboundReceipt, (receipt) => receipt.lines, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'inbound_receipt_id' })
  inbound_receipt: InboundReceipt;

  // Sản phẩm nhận (tham chiếu sang bảng Product)
  @Column()
  product_id: string;

  // Số lượng kỳ vọng từ PO (hoặc ASN)
  @Column({ type: 'int' })
  expected_qty: number;

  // Số lượng thực tế nhận tại Dock
  @Column({ type: 'int', default: 0 })
  received_qty: number;

  // Số lượng đạt QC — sẽ được Putaway lên kệ
  @Column({ type: 'int', default: 0 })
  accepted_qty: number;

  // Số lượng bị từ chối sau QC
  @Column({ type: 'int', default: 0 })
  rejected_qty: number;

  // Trạng thái kiểm tra chất lượng
  @Column({ type: 'enum', enum: QcStatus, default: QcStatus.PENDING })
  qc_status: QcStatus;

  // Vị trí kệ sau khi Putaway (VD: A-01-03-02 = Khu A, Dãy 01, Tầng 03, Ô 02)
  @Column({ nullable: true })
  putaway_location: string;

  // Số lô (Batch/Lot tracking cho hàng hóa có hạn sử dụng)
  @Column({ nullable: true })
  lot_number: string;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
