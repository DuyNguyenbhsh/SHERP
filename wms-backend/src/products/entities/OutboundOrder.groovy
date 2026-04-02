// Entity: OutboundOrder (Phiếu xuất kho)
// Mục đích: Chứa thông tin hàng cần xuất (lấy từ Sale Order đổ về)
@Entity()
export class OutboundOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderCode: string; // Mã đơn hàng (VD: SO-2026-001)

  @Column()
  customerName: string;

  @Column()
  deliveryAddress: string;

  @Column('float')
  totalWeight: number; // Tổng trọng lượng (Lấy từ tổng Product)

  @Column({ default: 'PENDING' })
  status: 'PENDING' | 'PICKED' | 'PACKED' | 'HANDOVER_TMS'; 
}

// Entity: Waybill (Vận đơn - Giống màn hình bạn chụp)
// Mục đích: Quản lý việc giao hàng
@Entity()
export class Waybill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  waybillCode: string; // Mã vận đơn (VD: VD-1402-001)

  @OneToOne(() => OutboundOrder)
  @JoinColumn()
  order: OutboundOrder; // Link tới phiếu xuất kho nào

  @Column('int')
  packageCount: number; // Số kiện

  @Column({ nullable: true })
  driverId: string; // Tài xế (Sẽ link bảng User)

  @Column({ nullable: true })
  vehicleId: string; // Biển số xe

  @Column({ default: 'WAITING_FOR_PICKUP' })
  status: 'WAITING_FOR_PICKUP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
}