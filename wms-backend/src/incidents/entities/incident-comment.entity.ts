import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Incident } from './incident.entity';

@Entity('incident_comments')
@Index('IDX_ICMT_INCIDENT', ['incident_id', 'created_at'])
export class IncidentComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  incident_id: string;

  @ManyToOne(() => Incident, (i) => i.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'incident_id' })
  incident: Incident;

  @Column({ type: 'uuid' })
  actor_id: string;

  @Column({ type: 'text' })
  body: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;
}
