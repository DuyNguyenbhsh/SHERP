import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ChecklistFrequency } from '../enums/checklist.enum';
import { ChecklistItemTemplate } from './checklist-item-template.entity';

@Entity('checklist_templates')
@Index('IDX_CLT_ACTIVE', ['is_active', 'frequency'])
export class ChecklistTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: ChecklistFrequency })
  frequency: ChecklistFrequency;

  // Ví dụ: ELECTRICAL, FIRE_SAFETY, HVAC, SANITATION
  @Column({ type: 'varchar', length: 40, nullable: true })
  asset_type: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @OneToMany(() => ChecklistItemTemplate, (i) => i.template, { cascade: true })
  items: ChecklistItemTemplate[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}
