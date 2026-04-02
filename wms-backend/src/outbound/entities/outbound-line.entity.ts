import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OutboundOrder } from './outbound-order.entity';
import { PickStatus } from '../enums/outbound.enum';

@Entity('outbound_lines')
export class OutboundLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => OutboundOrder, (order) => order.lines, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'outbound_order_id' })
  outbound_order: OutboundOrder;

  // Sản phẩm cần xuất
  @Column()
  product_id: string;

  // Số lượng yêu cầu xuất
  @Column({ type: 'int' })
  requested_qty: number;

  // Số lượng đã phân bổ (Reserved từ InventoryItem)
  @Column({ type: 'int', default: 0 })
  allocated_qty: number;

  // Số lượng đã lấy thực tế (Picker xác nhận)
  @Column({ type: 'int', default: 0 })
  picked_qty: number;

  // Số lượng đã đóng gói
  @Column({ type: 'int', default: 0 })
  packed_qty: number;

  // Trạng thái lấy hàng
  @Column({ type: 'enum', enum: PickStatus, default: PickStatus.PENDING })
  pick_status: PickStatus;

  // Vị trí lấy hàng (gợi ý từ hệ thống hoặc Picker chọn)
  @Column({ nullable: true })
  pick_location_id: string;

  // Số lô hàng (nếu có Lot tracking)
  @Column({ nullable: true })
  lot_number: string;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
