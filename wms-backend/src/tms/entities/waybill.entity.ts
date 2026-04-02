import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Vehicle } from '../../vehicles/entities/vehicle.entity';
import { OutboundOrder } from '../../outbound/entities/outbound-order.entity';
import { WaybillStatus, CodStatus } from '../enums/tms.enum';

@Entity('waybills')
export class Waybill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  waybill_code: string; // Mã vận đơn (VD: WB-260314-001)

  // Trạng thái luồng Dock-to-Door
  @Column({ type: 'enum', enum: WaybillStatus, default: WaybillStatus.DRAFT })
  status: WaybillStatus;

  // --- LIÊN KẾT XE (Many Waybills → One Vehicle) ---
  @ManyToOne(() => Vehicle, { nullable: true })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle;

  @Column({ nullable: true })
  vehicle_id: string;

  // --- LIÊN KẾT PHIẾU XUẤT (One Waybill → Many OutboundOrders) ---
  @OneToMany(() => OutboundOrder, (order) => order.waybill)
  outbound_orders: OutboundOrder[];

  // --- THÔNG TIN GIAO HÀNG ---
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  cod_amount: number; // Tiền thu hộ

  @Column({ type: 'enum', enum: CodStatus, default: CodStatus.PENDING })
  cod_status: CodStatus;

  @Column({ nullable: true })
  weight: number; // Tổng khối lượng (gram)

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  shipping_fee: number; // Phí vận chuyển

  // --- NHÀ VẬN CHUYỂN NGOÀI (nếu External) ---
  @Column({ nullable: true })
  provider_id: string;

  // --- TÀI XẾ NỘI BỘ (nếu Internal) ---
  @Column({ nullable: true })
  driver_name: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
