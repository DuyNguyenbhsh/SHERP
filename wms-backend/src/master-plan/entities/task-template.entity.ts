import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WorkItemType } from '../../work-items/enums/work-item.enum';
import { ExecutorParty } from '../../facility-catalog/enums/executor-party.enum';
import { FacilitySystem } from '../../facility-catalog/entities/facility-system.entity';
import { FacilityEquipmentItem } from '../../facility-catalog/entities/facility-equipment-item.entity';
import { WbsNode } from './wbs-node.entity';

@Entity('task_templates')
@Index('IDX_TT_NODE', ['wbs_node_id'])
@Index('IDX_TT_ACTIVE_TYPE', ['is_active', 'work_item_type'])
@Index('IDX_TT_SYSTEM', ['system_id'])
@Index('IDX_TT_EXECUTOR', ['executor_party'])
@Index('IDX_TT_FREQ', ['freq_code'])
export class TaskTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  wbs_node_id: string;

  @ManyToOne(() => WbsNode, (n) => n.task_templates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wbs_node_id' })
  wbs_node: WbsNode;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  // Song ngữ — BR-MP-12: null fallback về name (VI)
  @Column({ type: 'varchar', length: 500, nullable: true })
  name_en: string | null;

  @Column({ type: 'enum', enum: WorkItemType })
  work_item_type: WorkItemType;

  // Taxonomy (US-MP-10) — SET NULL khi xoá master-data
  @Column({ type: 'uuid', nullable: true })
  system_id: string | null;

  @ManyToOne(() => FacilitySystem, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'system_id' })
  system: FacilitySystem | null;

  @Column({ type: 'uuid', nullable: true })
  equipment_item_id: string | null;

  @ManyToOne(() => FacilityEquipmentItem, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'equipment_item_id' })
  equipment_item: FacilityEquipmentItem | null;

  // BR-MP-08: NOT NULL, default INTERNAL
  @Column({
    type: 'enum',
    enum: ExecutorParty,
    enumName: 'task_executor_party',
    default: ExecutorParty.INTERNAL,
  })
  executor_party: ExecutorParty;

  // BR-MP-09: required khi executor IN (CONTRACTOR, MIXED) — enforce ở DTO + DB CHECK
  @Column({ type: 'varchar', length: 255, nullable: true })
  contractor_name: string | null;

  // Mã tắt render Annual Grid (BA §10.5)
  @Column({ type: 'varchar', length: 16, nullable: true })
  freq_code: string | null;

  // BR-MP-11: list text (tối đa 10 tag via DTO)
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  regulatory_refs: string[];

  // BR-MP-10: Y/Urgent = Yearly + cho phép ad-hoc từ Incident escalation
  @Column({ type: 'boolean', default: false })
  allow_adhoc_trigger: boolean;

  // RFC 5545 RRULE, parse bằng `rrule-parser.logic.ts`
  @Column({ type: 'varchar', length: 200 })
  recurrence_rule: string;

  @Column({ type: 'int', default: 24 })
  sla_hours: number;

  // Link tới template cụ thể của module con (ChecklistTemplate, ...)
  @Column({ type: 'uuid', nullable: true })
  template_ref_id: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  default_assignee_role: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'date', nullable: true })
  last_generated_date: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}
