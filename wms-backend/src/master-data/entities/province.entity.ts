import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Commune } from './commune.entity';

@Entity()
export class Province {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string; // Mã tỉnh (VD: T_SG, T_HANOI)

  @Column()
  name: string; // Tên tỉnh (VD: TP. Hồ Chí Minh, Tỉnh Âu Lạc...)

  @OneToMany(() => Commune, (commune) => commune.province)
  communes: Commune[];
}
