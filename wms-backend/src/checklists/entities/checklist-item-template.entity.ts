import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ChecklistResultType } from '../enums/checklist.enum';
import { ChecklistTemplate } from './checklist-template.entity';

@Entity('checklist_item_templates')
@Index('IDX_CLIT_TEMPLATE_ORDER', ['template_id', 'display_order'])
export class ChecklistItemTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  template_id: string;

  @ManyToOne(() => ChecklistTemplate, (t) => t.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template: ChecklistTemplate;

  @Column({ type: 'int' })
  display_order: number;

  @Column({ type: 'varchar', length: 500 })
  content: string;

  @Column({
    type: 'enum',
    enum: ChecklistResultType,
    default: ChecklistResultType.PASS_FAIL,
  })
  result_type: ChecklistResultType;

  @Column({ type: 'boolean', default: false })
  require_photo: boolean;

  @Column({ type: 'varchar', length: 20, nullable: true })
  value_unit: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;
}
