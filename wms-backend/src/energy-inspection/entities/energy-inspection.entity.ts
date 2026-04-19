import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EnergyInspectionStatus } from '../enums/energy.enum';
import { EnergyReading } from './energy-reading.entity';

@Entity('energy_inspections')
@Index('IDX_EI_PROJECT_STATUS', ['project_id', 'status'])
@Index('IDX_EI_ASSIGNEE_STATUS', ['assignee_id', 'status'])
export class EnergyInspection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  project_id: string;

  @Column({ type: 'uuid', nullable: true })
  work_item_id: string | null;

  @Column({ type: 'uuid' })
  assignee_id: string;

  @Column({ type: 'date' })
  inspection_date: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  due_date: Date | null;

  @Column({
    type: 'enum',
    enum: EnergyInspectionStatus,
    default: EnergyInspectionStatus.NEW,
  })
  status: EnergyInspectionStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // Danh sách meter cần đọc trong inspection này (UUID refs)
  @Column({ type: 'jsonb', default: () => "'[]'" })
  required_meter_ids: string[];

  @Column({ type: 'timestamp with time zone', nullable: true })
  completed_at: Date | null;

  @OneToMany(() => EnergyReading, (r) => r.inspection)
  readings: EnergyReading[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}
