import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class TransportRoute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string; // Mã tuyến (VD: Q7, BDU)

  @Column()
  name: string; // Tên tuyến (VD: Quận 7, Bình Dương)

  @Column({ nullable: true })
  description: string;
}
