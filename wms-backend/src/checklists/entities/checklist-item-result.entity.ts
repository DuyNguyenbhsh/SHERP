import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ItemResultState, PhotoCategory } from '../enums/checklist.enum';
import { ChecklistInstance } from './checklist-instance.entity';
import { ChecklistItemTemplate } from './checklist-item-template.entity';

@Entity('checklist_item_results')
@Index('IDX_CIR_INSTANCE', ['instance_id'])
@Index('IDX_CIR_UNIQUE', ['instance_id', 'item_template_id'], { unique: true })
export class ChecklistItemResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  instance_id: string;

  @ManyToOne(() => ChecklistInstance, (i) => i.results, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'instance_id' })
  instance: ChecklistInstance;

  @Column({ type: 'uuid' })
  item_template_id: string;

  @ManyToOne(() => ChecklistItemTemplate, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'item_template_id' })
  item_template: ChecklistItemTemplate;

  @Column({ type: 'enum', enum: ItemResultState, nullable: true })
  result: ItemResultState | null;

  @Column({ type: 'numeric', precision: 18, scale: 4, nullable: true })
  value: string | null;

  // Cloudinary secure_url; tối đa 10 ảnh / item theo BA_SPEC
  @Column({ type: 'jsonb', default: () => "'[]'" })
  photos: string[];

  @Column({ type: 'enum', enum: PhotoCategory, nullable: true })
  photo_category: PhotoCategory | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  checked_at: Date;
}
