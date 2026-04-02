import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class DeliveryProvider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string; // Mã (VD: GHN, VTP)

  @Column()
  name: string; // Tên (VD: Giao Hàng Nhanh)

  @Column({ nullable: true })
  phone: string; // Điện thoại

  @Column({ nullable: true })
  address: string; // Địa chỉ

  @Column({ default: true })
  isActive: boolean; // Trạng thái hoạt động
}
