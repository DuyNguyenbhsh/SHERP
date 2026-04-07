import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { NonConformanceReport } from './non-conformance-report.entity';

@Entity('ncr_attachments')
export class NcrAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => NonConformanceReport, (ncr) => ncr.attachments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ncr_id' })
  ncr: NonConformanceReport;

  @Index()
  @Column()
  ncr_id: string;

  @Column({ type: 'varchar', length: 10 })
  phase: 'BEFORE' | 'AFTER';

  @Column({ length: 500 })
  file_url: string;

  @Column({ length: 255, nullable: true })
  file_name: string;

  @Column({ nullable: true })
  uploaded_by: string;

  @CreateDateColumn()
  uploaded_at: Date;
}
