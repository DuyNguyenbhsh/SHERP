import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { Employee } from '../../users/entities/employee.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import {
  ProjectStage,
  ProjectStatus,
  ProjectType,
} from '../enums/project.enum';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  project_code: string;

  @Column({ length: 255 })
  project_name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // ── Liên kết Tổ chức (M2O) ──
  @ManyToOne(() => Organization, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ nullable: true })
  organization_id: string;

  // ── Loai du an ──
  @Column({ type: 'varchar', length: 30, default: ProjectType.CONSTRUCTION })
  project_type: ProjectType;

  // ── IMPC Portfolio Stage ──
  @Column({ type: 'varchar', length: 30, default: ProjectStage.PLANNING })
  stage: ProjectStage;

  // ── Trạng thái dự án ──
  @Column({ type: 'varchar', length: 30, default: ProjectStatus.DRAFT })
  status: ProjectStatus;

  // ── Địa điểm ──
  @Column({ length: 255, nullable: true })
  location: string;

  // ── Tổng diện tích sàn (GFA - Gross Floor Area) ──
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  gfa_m2: number;

  // ── Chủ đầu tư (FK → suppliers) — RESTRICT: không xóa NCC khi có dự án tham chiếu ──
  @ManyToOne(() => Supplier, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'investor_id' })
  investor: Supplier;

  @Column({ nullable: true })
  investor_id: string;

  // ── Giám đốc dự án (FK → employees) — RESTRICT: không xóa NV khi đang là PM ──
  @ManyToOne(() => Employee, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'manager_id' })
  manager: Employee;

  @Column({ nullable: true })
  manager_id: string;

  // ── Phòng ban quản lý (FK → organizations) — RESTRICT: không xóa PB khi có dự án ──
  @ManyToOne(() => Organization, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'department_id' })
  department: Organization;

  @Column({ nullable: true })
  department_id: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  budget: number;

  // ── Dau thau ──
  @Column({ type: 'date', nullable: true })
  bid_date: Date;

  @Column({ type: 'date', nullable: true })
  bid_result_date: Date;

  @Column({ type: 'text', nullable: true })
  lost_bid_reason: string;

  @Column({ type: 'jsonb', nullable: true })
  risk_assessment: Record<string, unknown>;

  // ── Hop dong CĐT ──
  @Column({ length: 100, nullable: true })
  contract_number: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  contract_value: number;

  @Column({ type: 'date', nullable: true })
  contract_date: Date;

  // ── Bao hanh ──
  @Column({ type: 'date', nullable: true })
  warranty_start: Date;

  @Column({ type: 'date', nullable: true })
  warranty_end: Date;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    default: 5.0,
  })
  retention_rate: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
