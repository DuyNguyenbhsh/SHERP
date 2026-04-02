import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OutboundLine } from './outbound-line.entity';
import { OutboundStatus, OutboundType } from '../enums/outbound.enum';
import { Waybill } from '../../tms/entities/waybill.entity';

@Entity('outbound_orders')
export class OutboundOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  order_number: string; // VD: OB-260314-001

  // Loại phiếu xuất kho
  @Column({
    type: 'enum',
    enum: OutboundType,
    default: OutboundType.SALES_ORDER,
  })
  order_type: OutboundType;

  // Trạng thái luồng Order-to-Fulfillment
  @Column({
    type: 'enum',
    enum: OutboundStatus,
    default: OutboundStatus.PENDING,
  })
  status: OutboundStatus;

  // Thông tin khách hàng / đơn vị nhận
  @Column({ nullable: true })
  customer_name: string;

  @Column({ nullable: true })
  customer_phone: string;

  @Column({ type: 'text', nullable: true })
  delivery_address: string;

  // Tham chiếu mã đơn hàng gốc (Sales Order, Transfer Request, Work Order...)
  @Column({ nullable: true })
  reference_code: string;

  // Kho xuất hàng
  @Column({ nullable: true })
  warehouse_code: string;

  // Ngày yêu cầu giao
  @Column({ type: 'date', nullable: true })
  required_date: Date;

  // Nhân viên phụ trách
  @Column({ nullable: true })
  assigned_to: string;

  // Tổng trọng lượng (kg) — TMS dùng để tính tải trọng xe
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_weight: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => OutboundLine, (line) => line.outbound_order, {
    cascade: true,
  })
  lines: OutboundLine[];

  // Liên kết TMS: Phiếu xuất thuộc vận đơn nào
  @ManyToOne(() => Waybill, (waybill) => waybill.outbound_orders, {
    nullable: true,
  })
  @JoinColumn({ name: 'waybill_id' })
  waybill: Waybill;

  @Column({ nullable: true })
  waybill_id: string;

  // Liên kết dự án (BOQ threshold check)
  @Column({ nullable: true })
  project_id: string;

  @Column({ nullable: true })
  wbs_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
