import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PhotoCategory } from '../../checklists/enums/checklist.enum';
import { Incident } from './incident.entity';

@Entity('incident_photos')
@Index('IDX_IP_INCIDENT', ['incident_id'])
export class IncidentPhoto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  incident_id: string;

  @ManyToOne(() => Incident, (i) => i.photos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'incident_id' })
  incident: Incident;

  @Column({ type: 'varchar', length: 500 })
  secure_url: string; // Cloudinary

  @Column({ type: 'enum', enum: PhotoCategory })
  category: PhotoCategory;

  @Column({ type: 'uuid' })
  uploaded_by: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  uploaded_at: Date;
}
