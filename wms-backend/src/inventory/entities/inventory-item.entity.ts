import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Location } from './location.entity';
import { StockStatus } from '../enums/inventory.enum';

@Entity('inventory_items')
// Index composite: query tồn kho theo sản phẩm + vị trí + lô hàng (tránh full table scan)
@Index('IDX_INV_PRODUCT_LOCATION_LOT', [
  'product_id',
  'location_id',
  'lot_number',
])
@Index('IDX_INV_PRODUCT_STATUS', ['product_id', 'status'])
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Sản phẩm (tham chiếu sang bảng Product)
  @Column()
  product_id: string;

  // Vị trí kệ (FK → Location)
  @ManyToOne(() => Location, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @Column({ nullable: true })
  location_id: string;

  // Số lượng tồn thực tế tại ô kệ này
  @Column({ type: 'int', default: 0 })
  qty_on_hand: number;

  // Số lượng đã giữ cho đơn hàng (Reserved) — chưa xuất kho
  @Column({ type: 'int', default: 0 })
  qty_reserved: number;

  // Số lượng khả dụng = qty_on_hand - qty_reserved (computed tại application layer)

  // Trạng thái lô hàng
  @Column({ type: 'enum', enum: StockStatus, default: StockStatus.AVAILABLE })
  status: StockStatus;

  // Theo dõi lô hàng (Batch tracking cho thực phẩm, hóa chất, linh kiện có hạn sử dụng)
  @Column({ nullable: true, length: 100 })
  lot_number: string;

  // Serial Number đơn lẻ (cho hàng bật is_serial_tracking — mỗi serial = 1 record, qty_on_hand = 1)
  @Column({ nullable: true, length: 100 })
  serial_number: string;

  // Liên kết nguồn gốc: Phiếu nhập kho nào đã tạo bản ghi này
  @Column({ nullable: true })
  inbound_receipt_id: string;

  // Mã kho (denormalized từ Location để query nhanh)
  @Column({ nullable: true, length: 50 })
  warehouse_code: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
