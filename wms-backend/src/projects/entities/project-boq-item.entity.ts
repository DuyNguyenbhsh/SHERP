import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';
import { Project } from './project.entity';
import { ProjectWbs } from './project-wbs.entity';
import { CostCategory } from './cost-category.entity';

@Entity('project_boq_items')
@Unique(['project_id', 'item_code'])
@Index('idx_boq_project_wbs', ['project_id', 'wbs_id'])
export class ProjectBoqItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column()
  project_id: string;

  @ManyToOne(() => ProjectWbs, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'wbs_id' })
  wbs: ProjectWbs;

  @Column({ nullable: true })
  wbs_id: string;

  @Column({ length: 50 })
  item_code: string;

  @Column({ length: 255 })
  item_name: string;

  @Column({ length: 30 })
  unit: string; // m3, kg, piece, tấn...

  // Khối lượng theo BOQ (định mức)
  @Column({ type: 'decimal', precision: 15, scale: 4, default: 0 })
  quantity: number;

  // Đơn giá kế hoạch
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  unit_price: number;

  // Thành tiền = quantity × unit_price
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  total_price: number;

  // Liên kết lỏng đến product (WMS)
  @Column({ nullable: true })
  product_id: string;

  @ManyToOne(() => CostCategory, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category: CostCategory;

  @Column({ nullable: true })
  category_id: string;

  // Tổng lượng đã xuất kho (cập nhật khi WMS xuất)
  @Column({ type: 'decimal', precision: 15, scale: 4, default: 0 })
  issued_qty: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
