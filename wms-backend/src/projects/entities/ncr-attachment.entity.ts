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

  @Column({ length: 255, nullable: true })
  public_id: string;

  @Column({ type: 'int', nullable: true })
  file_size: number;

  @Column({ length: 20, nullable: true })
  file_format: string;

  @Column({ length: 20, nullable: true, default: 'image' })
  resource_type: string;

  @Column({ type: 'boolean', default: false })
  is_missing: boolean;

  @Column({ nullable: true })
  uploaded_by: string;

  @CreateDateColumn()
  uploaded_at: Date;
}
