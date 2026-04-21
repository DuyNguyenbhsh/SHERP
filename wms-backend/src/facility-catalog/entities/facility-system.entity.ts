import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FacilityEquipmentItem } from './facility-equipment-item.entity';

@Entity('facility_systems')
@Index('IDX_FS_ACTIVE', ['is_active', 'sort_order'])
export class FacilitySystem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 32, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 200 })
  name_vi: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  name_en: string | null;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @OneToMany(() => FacilityEquipmentItem, (item) => item.system)
  equipment_items: FacilityEquipmentItem[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}
