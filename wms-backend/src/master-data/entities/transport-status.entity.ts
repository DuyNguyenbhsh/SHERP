import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class TransportStatus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string; // Mã (VD: 10, 20)

  @Column()
  name: string; // Tên (VD: Chờ phân công)

  @Column({ nullable: true })
  description: string; // Mô tả
}
