import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FacilitySystem } from './facility-system.entity';

@Entity('facility_equipment_items')
@Index('IDX_FEI_SYSTEM', ['system_id', 'sort_order'])
export class FacilityEquipmentItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  system_id: string;

  @ManyToOne(() => FacilitySystem, (s) => s.equipment_items, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'system_id' })
  system: FacilitySystem;

  @Column({ type: 'varchar', length: 32, unique: true, nullable: true })
  code: string | null;

  @Column({ type: 'varchar', length: 200 })
  name_vi: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  name_en: string | null;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}
