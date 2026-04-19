import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { IncidentApprovalStatus } from '../enums/incident.enum';
import { Incident } from './incident.entity';

@Entity('incident_reopen_requests')
@Index('IDX_IRR_INCIDENT_STATUS', ['incident_id', 'status'])
export class IncidentReopenRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  incident_id: string;

  @ManyToOne(() => Incident, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'incident_id' })
  incident: Incident;

  @Column({ type: 'uuid' })
  requested_by: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({
    type: 'enum',
    enum: IncidentApprovalStatus,
    default: IncidentApprovalStatus.PENDING,
  })
  status: IncidentApprovalStatus;

  @Column({ type: 'uuid', nullable: true })
  decided_by: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  decided_at: Date | null;

  @Column({ type: 'text', nullable: true })
  decision_note: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;
}
