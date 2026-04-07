import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Project } from './project.entity';
import { Employee } from '../../users/entities/employee.entity';
import {
  NcrCategory,
  NcrSeverity,
  NcrStatus,
  NcrRelatedType,
} from '../enums/ncr.enum';
import { NcrAttachment } from './ncr-attachment.entity';

@Entity('non_conformance_reports')
export class NonConformanceReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  ncr_code: string;

  // ── Du an ──
  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Index()
  @Column()
  project_id: string;

  // ── Phan loai ──
  @Index()
  @Column({ type: 'varchar', length: 20 })
  category: NcrCategory;

  @Column({ type: 'varchar', length: 20 })
  severity: NcrSeverity;

  @Column({ type: 'varchar', length: 20, nullable: true })
  related_type: NcrRelatedType;

  @Column({ length: 255, nullable: true })
  related_id: string;

  // ── Noi dung ──
  @Column({ type: 'text' })
  description: string;

  @Column({ length: 255, nullable: true })
  location_detail: string;

  // ── Phan cong ──
  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_to' })
  assignee: Employee;

  @Column({ nullable: true })
  assigned_to: string;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_by' })
  assigner: Employee;

  @Column({ nullable: true })
  assigned_by: string;

  // ── Trang thai ──
  @Index()
  @Column({ type: 'varchar', length: 20, default: NcrStatus.OPEN })
  status: NcrStatus;

  @Column({ type: 'text', nullable: true })
  resolution_note: string;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'verified_by' })
  verifier: Employee;

  @Column({ nullable: true })
  verified_by: string;

  @Column({ type: 'timestamp', nullable: true })
  verified_at: Date;

  // ── Phat ──
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  penalty_amount: number;

  @Column({ nullable: true })
  subcontract_id: string;

  // ── Audit ──
  @Column({ nullable: true })
  created_by: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // ── Relations ──
  @OneToMany(() => NcrAttachment, (att) => att.ncr, { cascade: true })
  attachments: NcrAttachment[];
}
