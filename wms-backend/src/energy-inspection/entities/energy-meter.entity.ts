import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MeterType } from '../enums/energy.enum';

@Entity('energy_meters')
@Index('IDX_EM_PROJECT_ACTIVE', ['project_id', 'is_active'])
@Index('IDX_EM_CODE', ['code'], { unique: true })
export class EnergyMeter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 40 })
  code: string; // ví dụ EM-TOWER-A-L3-01

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'uuid' })
  project_id: string;

  @Column({ type: 'enum', enum: MeterType })
  meter_type: MeterType;

  @Column({ type: 'varchar', length: 20 })
  unit: string; // kWh / m³ / m³

  @Column({ type: 'varchar', length: 200, nullable: true })
  location_text: string | null;

  // Cumulative vs differential: đồng hồ tổng (true = non-decreasing)
  @Column({ type: 'boolean', default: true })
  is_cumulative: boolean;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}
