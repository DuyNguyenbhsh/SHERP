import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { SerialStatus } from '../enums/procurement.enum';

@Entity('serial_numbers')
export class SerialNumber {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  serial_no: string; // Chuỗi SN dán trên hộp (VD: SN-123456789)

  @Column()
  product_id: string;

  @Column()
  grn_id: string; // Biết chính xác con chip này nhập từ chuyến xe nào

  @Column({ type: 'enum', enum: SerialStatus, default: SerialStatus.IN_STOCK })
  status: SerialStatus;

  @CreateDateColumn()
  created_at: Date;
}
