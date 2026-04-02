import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string; // Mã số (VD: 51C66611)

  @Column({ nullable: true })
  licensePlate: string; // Biển số (VD: 51C-666.11)

  @Column()
  driverName: string; // Tên xe/Tài xế (VD: Nguyễn Văn A)

  @Column({ nullable: true })
  brand: string; // Hãng xe (VD: Isuzu, Suzuki, Xe máy)

  @Column({ default: 'Sẵn sàng' })
  status: string; // Hoạt động, Bảo trì...

  @Column({ nullable: true })
  description: string; // Mô tả thêm
}
