import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EnergyInspection } from './energy-inspection.entity';
import { EnergyMeter } from './energy-meter.entity';

@Entity('energy_readings')
@Index('IDX_ER_INSPECTION', ['inspection_id'])
@Index('IDX_ER_METER_DATE', ['meter_id', 'recorded_at'])
@Index('IDX_ER_UNIQUE', ['inspection_id', 'meter_id'], { unique: true })
export class EnergyReading {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  inspection_id: string;

  @ManyToOne(() => EnergyInspection, (i) => i.readings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inspection_id' })
  inspection: EnergyInspection;

  @Column({ type: 'uuid' })
  meter_id: string;

  @ManyToOne(() => EnergyMeter, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'meter_id' })
  meter: EnergyMeter;

  @Column({ type: 'numeric', precision: 18, scale: 4 })
  value: string;

  @Column({ type: 'numeric', precision: 18, scale: 4, nullable: true })
  previous_value: string | null;

  @Column({ type: 'numeric', precision: 18, scale: 4, nullable: true })
  delta: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  photo_url: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'uuid' })
  recorded_by: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  recorded_at: Date;
}
