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
import { LocationType, LocationStatus } from '../enums/inventory.enum';

@Entity('locations')
export class Location {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Mã vị trí duy nhất (VD: WH-HCM-01, A-01-03-02)
  @Column({ unique: true, length: 50 })
  code: string;

  @Column({ length: 255 })
  name: string; // Tên mô tả (VD: "Khu A - Linh kiện máy tính")

  // Mã vạch dán tại kệ — nhân viên dùng PDA quét để xác nhận Putaway/Picking
  @Column({ unique: true, nullable: true, length: 100 })
  barcode: string;

  @Column({ type: 'enum', enum: LocationType, default: LocationType.BIN })
  location_type: LocationType;

  @Column({
    type: 'enum',
    enum: LocationStatus,
    default: LocationStatus.ACTIVE,
  })
  status: LocationStatus;

  // Cây phân cấp: Warehouse → Zone → Aisle → Bin
  @ManyToOne(() => Location, (loc) => loc.children, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_id' })
  parent: Location;

  @OneToMany(() => Location, (loc) => loc.parent)
  children: Location[];

  // Sức chứa tối đa (theo đơn vị tính chuẩn, VD: 200 cái)
  @Column({ type: 'int', default: 0 })
  max_capacity: number;

  // Số lượng đang chiếm dụng hiện tại
  @Column({ type: 'int', default: 0 })
  current_qty: number;

  // Mã kho cha (để query nhanh, tránh đệ quy tìm warehouse gốc)
  @Column({ nullable: true, length: 50 })
  warehouse_code: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
