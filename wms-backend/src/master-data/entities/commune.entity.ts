import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Province } from './province.entity';

@Entity()
export class Commune {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string; // Mã xã (VD: P_BEN_NGHE)

  @Column()
  name: string; // Tên xã (VD: Phường Bến Nghé)

  // Liên kết trực tiếp Tỉnh -> Xã
  @ManyToOne(() => Province, (province) => province.communes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'provinceId' })
  province: Province;

  @Column()
  provinceId: string; // Lưu ID tỉnh để query cho nhanh
}
