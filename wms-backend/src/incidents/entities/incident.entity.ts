import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  IncidentCategory,
  IncidentSeverity,
  IncidentStatus,
} from '../enums/incident.enum';
import { IncidentPhoto } from './incident-photo.entity';
import { IncidentComment } from './incident-comment.entity';

@Entity('incidents')
@Index('IDX_INC_PROJECT_STATUS', ['project_id', 'status'])
@Index('IDX_INC_ASSIGNEE', ['assigned_to'])
export class Incident {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 40, unique: true })
  incident_code: string; // IC-YYMMDD-XXX

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'uuid' })
  project_id: string;

  @Column({ type: 'uuid', nullable: true })
  work_item_id: string | null;

  @Column({ type: 'enum', enum: IncidentSeverity })
  severity: IncidentSeverity;

  @Column({
    type: 'enum',
    enum: IncidentCategory,
    default: IncidentCategory.OTHER,
  })
  category: IncidentCategory;

  @Column({ type: 'varchar', length: 200, nullable: true })
  location_text: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  related_asset: string | null;

  @Column({ type: 'uuid' })
  reported_by: string;

  @Column({ type: 'uuid', nullable: true })
  assigned_to: string | null;

  @Column({ type: 'enum', enum: IncidentStatus, default: IncidentStatus.NEW })
  status: IncidentStatus;

  @Column({ type: 'timestamp with time zone', nullable: true })
  due_date: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  assigned_at: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  resolved_at: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  closed_at: Date | null;

  @OneToMany(() => IncidentPhoto, (p) => p.incident)
  photos: IncidentPhoto[];

  @OneToMany(() => IncidentComment, (c) => c.incident)
  comments: IncidentComment[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}
