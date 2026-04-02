import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Project } from './project.entity';

export enum SettlementStatus {
  DRAFT = 'DRAFT',
  FINALIZED = 'FINALIZED',
}

@Entity('project_settlements')
export class ProjectSettlement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column()
  project_id: string;

  @Column({ type: 'date' })
  settlement_date: Date;

  @Column({ type: 'varchar', length: 30, default: SettlementStatus.DRAFT })
  status: SettlementStatus;

  // Tổng giá trị vật tư đã cấp phát (xuất kho)
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  total_material_in: number;

  // Tổng giá trị vật tư đã hoàn trả
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  total_material_out: number;

  // Giá trị tồn hiện trường (kiểm kê thực tế)
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  on_site_stock_value: number;

  // Chênh lệch = in - out - on_site
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  variance: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  variance_percent: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ nullable: true })
  settled_by: string;

  @OneToMany(() => ProjectSettlementLine, (line) => line.settlement, {
    cascade: true,
  })
  lines: ProjectSettlementLine[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

@Entity('project_settlement_lines')
export class ProjectSettlementLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ProjectSettlement, (s) => s.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'settlement_id' })
  settlement: ProjectSettlement;

  @Column()
  settlement_id: string;

  @Column()
  product_id: string;

  @Column({ length: 255 })
  product_name: string;

  @Column({ length: 30 })
  unit: string;

  @Column({ type: 'decimal', precision: 15, scale: 4, default: 0 })
  qty_issued: number;

  @Column({ type: 'decimal', precision: 15, scale: 4, default: 0 })
  qty_returned: number;

  // Số lượng kiểm kê thực tế (nhập tay)
  @Column({ type: 'decimal', precision: 15, scale: 4, default: 0 })
  qty_on_site: number;

  // Chênh lệch = issued - returned - on_site
  @Column({ type: 'decimal', precision: 15, scale: 4, default: 0 })
  qty_variance: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  unit_price: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  value_variance: number;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
