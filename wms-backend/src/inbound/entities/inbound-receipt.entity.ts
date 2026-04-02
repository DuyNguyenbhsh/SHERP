import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { InboundLine } from './inbound-line.entity';
import { InboundType, InboundStatus } from '../enums/inbound.enum';

@Entity('inbound_receipts')
export class InboundReceipt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  receipt_number: string; // VD: IBR-260314-001

  // Loại nhập kho: Từ PO, Trả hàng, Chuyển kho, Điều chỉnh
  @Column({ type: 'enum', enum: InboundType, default: InboundType.PO_RECEIPT })
  receipt_type: InboundType;

  // Trạng thái luồng Dock-to-Stock
  @Column({ type: 'enum', enum: InboundStatus, default: InboundStatus.PENDING })
  status: InboundStatus;

  // Liên kết với PO gốc (nullable cho các loại nhập không qua PO)
  @Column({ nullable: true })
  po_id: string;

  // Liên kết với GRN từ module Procurement (nullable)
  @Column({ nullable: true })
  grn_id: string;

  // Thông tin vận hành kho
  @Column({ nullable: true })
  warehouse_code: string; // Mã kho nhận hàng (VD: WH-HCM-01)

  @Column({ nullable: true })
  dock_number: string; // Cửa nhận hàng (VD: DOCK-A3)

  // Nhân viên kho nhận hàng
  @Column({ nullable: true })
  received_by: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => InboundLine, (line) => line.inbound_receipt, {
    cascade: true,
  })
  lines: InboundLine[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
