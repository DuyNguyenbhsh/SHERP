import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('work_item_masters')
export class WorkItemMaster {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  item_code: string;

  @Column({ length: 255 })
  item_name: string;

  @Column({ length: 30, nullable: true })
  unit: string;

  @Column({ length: 100, nullable: true })
  item_group: string;

  @Column({ type: 'jsonb', nullable: true })
  specifications: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  inspection_checklist: Record<string, unknown>[];

  @Column({ type: 'jsonb', nullable: true })
  reference_images: { url: string; caption?: string }[];

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
