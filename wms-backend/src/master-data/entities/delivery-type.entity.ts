import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class DeliveryType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string; // Mã (VD: 4H, HOA_TOC)

  @Column()
  name: string; // Tên (VD: Giao hàng 4 giờ)

  @Column({ nullable: true })
  description: string; // Mô tả
}
