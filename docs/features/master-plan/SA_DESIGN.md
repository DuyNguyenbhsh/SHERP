# SA_DESIGN: Master Plan + Work Item Engine (4 module con)

> **Tham chiếu:** `docs/features/master-plan/BA_SPEC.md` (Gate 1 APPROVED — commit `31ff0c8`)
> **Chuẩn:** Clean Architecture (Domain → Application → Infrastructure → Interface), NestJS feature-based module, PMI WBS, ISO 41001 FM.
> **Ngày:** 2026-04-18
> **Trạng thái:** Gate 2 — SA_DESIGN ✅ **APPROVED** (2026-04-18) → sẵn sàng Gate 3 DEV

---

## 0. TÓM TẮT KIẾN TRÚC

```
┌──────────────────────────────────────────────────────────────────┐
│                      MASTER PLAN (WBS tree)                       │
│  MasterPlan → WbsNode (5 levels) → TaskTemplate (recurrence)      │
└───────────────────┬──────────────────────────────────────────────┘
                    │  (Bull Queue + Upstash Redis, cron daily 00:00)
                    ▼
┌──────────────────────────────────────────────────────────────────┐
│                     WORK ITEM ENGINE (parent)                     │
│  work_items (polymorphic parent) + daily feed + notification      │
└──┬───────────────┬────────────────┬────────────────┬────────────┘
   ▼               ▼                ▼                ▼
┌──────────┐ ┌───────────┐  ┌──────────────┐  ┌──────────────┐
│ checklists│ │ incidents │  │ energy-inspec │  │ office-tasks │
│ (template │ │ (+ 2 flow │  │ -tion         │  │              │
│ +instance │ │  approval)│  │ (meter+read)  │  │              │
│ +result)  │ │           │  │               │  │              │
└──────────┘ └───────────┘  └──────────────┘  └──────────────┘

Dependencies dùng chung (loose coupling qua UUID, KHÔNG hard FK xuyên module):
  projects/     — building/asset context (project_id FK)
  employees/    — assignee_id
  approvals/    — sub-flow approval cho reopen + assignee change
  documents/    — version control ChecklistTemplate (doc tag)
  cloud-storage/— upload ảnh evidence (Cloudinary, limit 10MB/ảnh, max 10/instance)
  shared/audit/ — audit_log reusable
  BudgetService — checkBudgetLimit() khi approve Master Plan
```

**Nguyên tắc:** Mỗi module con CÓ state machine độc lập nhưng ĐỀU ghi 1 row cha vào `work_items` để render chung "Công việc của tôi" feed. Không ai query 4 bảng con riêng — feed dùng `work_items` + JOIN theo `work_item_type`.

---

## 1. FOLDER MAP (Clean Architecture + Feature-based)

```
wms-backend/src/
├── master-plan/                    # Parent — WBS + recurrence
│   ├── domain/
│   │   └── logic/
│   │       ├── rrule-parser.logic.ts           # pure fn: parse RFC 5545 → next-date
│   │       ├── rrule-parser.logic.spec.ts
│   │       ├── wbs-roll-up.logic.ts            # pure fn: tính progress_pct từ counts
│   │       ├── wbs-roll-up.logic.spec.ts
│   │       └── budget-rollup.logic.ts          # pure fn: sum budget node con ≤ cha
│   ├── dto/
│   │   ├── create-master-plan.dto.ts
│   │   ├── update-master-plan.dto.ts
│   │   ├── create-wbs-node.dto.ts
│   │   ├── create-task-template.dto.ts
│   │   └── query-wbs-tree.dto.ts
│   ├── entities/
│   │   ├── master-plan.entity.ts
│   │   ├── wbs-node.entity.ts
│   │   └── task-template.entity.ts
│   ├── enums/
│   │   ├── master-plan.enum.ts      # MasterPlanStatus, WbsNodeType, WorkItemType
│   │   └── recurrence.enum.ts
│   ├── infrastructure/
│   │   ├── queues/
│   │   │   ├── recurrence.processor.ts   # Bull worker (@Processor)
│   │   │   ├── recurrence.producer.ts    # cron daily 00:00 enqueue scan job
│   │   │   └── recurrence-queue.constants.ts
│   │   └── repositories/                 # (optional custom repo)
│   ├── services/
│   │   ├── master-plan.service.ts
│   │   ├── wbs-node.service.ts
│   │   ├── task-template.service.ts
│   │   ├── recurrence-engine.service.ts  # sinh instance (idempotent)
│   │   ├── wbs-roll-up.service.ts        # dashboard KPI
│   │   └── recurrence-engine.service.spec.ts
│   ├── master-plan.controller.ts
│   └── master-plan.module.ts
│
├── work-items/                     # Polymorphic parent + daily feed
│   ├── domain/
│   │   └── logic/
│   │       ├── work-item-dispatcher.logic.ts     # pick concrete service theo type
│   │       └── sla-overdue.logic.ts              # pure fn tính overdue từ due_date
│   ├── dto/
│   │   ├── query-work-item-feed.dto.ts           # filter cho "Công việc của tôi"
│   │   └── reassign-work-item.dto.ts
│   ├── entities/
│   │   └── work-item.entity.ts                    # cha polymorphic
│   ├── enums/
│   │   └── work-item.enum.ts                      # WorkItemStatus, WorkItemType
│   ├── services/
│   │   ├── work-item.service.ts                   # feed query, reassign, progress roll-up
│   │   └── work-item-notification.service.ts      # 2 kênh: email + web notification
│   ├── work-items.controller.ts
│   └── work-items.module.ts
│
├── checklists/                     # Module 1
│   ├── domain/logic/checklist-completion.logic.ts  # auto-transition COMPLETED khi 100%
│   ├── dto/…
│   ├── entities/
│   │   ├── checklist-template.entity.ts
│   │   ├── checklist-item-template.entity.ts
│   │   ├── checklist-instance.entity.ts
│   │   └── checklist-item-result.entity.ts
│   ├── enums/checklist.enum.ts
│   ├── services/
│   │   ├── checklist-template.service.ts
│   │   ├── checklist-instance.service.ts
│   │   ├── checklist-result.service.ts            # ghi result + auto transition
│   │   └── checklist-result.service.spec.ts
│   ├── checklists.controller.ts
│   └── checklists.module.ts
│
├── incidents/                      # Module 2
│   ├── domain/logic/
│   │   ├── incident-severity.logic.ts             # pure: CRITICAL → bypass notify hours
│   │   └── incident-reopen-policy.logic.ts        # pure: chỉ COMPLETED mới reopen được
│   ├── dto/…
│   ├── entities/
│   │   ├── incident.entity.ts
│   │   ├── incident-photo.entity.ts
│   │   ├── incident-comment.entity.ts
│   │   ├── incident-reopen-request.entity.ts
│   │   └── incident-assignee-change-request.entity.ts
│   ├── enums/incident.enum.ts
│   ├── services/
│   │   ├── incident.service.ts                     # tạo, assign, transition
│   │   ├── incident-reopen.service.ts              # sub-flow 1
│   │   ├── incident-assignee-change.service.ts    # sub-flow 2
│   │   ├── incident-export.service.ts              # export .docx (pptx slide 36)
│   │   └── incident.service.spec.ts
│   ├── incidents.controller.ts
│   └── incidents.module.ts
│
├── energy-inspection/              # Module 3
│   ├── domain/logic/
│   │   ├── energy-delta.logic.ts                  # previous/current + threshold check
│   │   └── energy-delta.logic.spec.ts
│   ├── dto/…
│   ├── entities/
│   │   ├── energy-meter.entity.ts
│   │   ├── energy-inspection.entity.ts
│   │   └── energy-reading.entity.ts
│   ├── enums/energy.enum.ts
│   ├── services/
│   │   ├── energy-meter.service.ts
│   │   ├── energy-inspection.service.ts
│   │   ├── energy-reading.service.ts               # + auto tạo Incident nếu vượt ngưỡng
│   │   └── energy-reading.service.spec.ts
│   ├── energy-inspection.controller.ts
│   └── energy-inspection.module.ts
│
├── office-tasks/                   # Module 4
│   ├── domain/logic/office-task-overdue.logic.ts
│   ├── dto/…
│   ├── entities/office-task.entity.ts
│   ├── enums/office-task.enum.ts
│   ├── services/office-task.service.ts
│   ├── office-tasks.controller.ts
│   └── office-tasks.module.ts
│
└── shared/
    └── queues/
        └── bull.module.ts           # BullModule.forRoot (Upstash Redis URL)
```

**Lý do split 6 module thay vì 1 module khổng lồ:**
- Mỗi module ≤ 500 LOC service → dễ review, dễ test
- Work Item engine là abstraction chung (feed, notification, reassign) — dùng lại được khi thêm module thứ 5 sau này (ví dụ: audit inspection)
- Import path rõ ràng: `checklists/` chỉ import `work-items/` (cha), KHÔNG import lẫn nhau

---

## 2. ERD — ENTITY RELATIONSHIPS

```
master_plans (1) ──────────────< wbs_nodes (N, self-ref parent_id)
   │                                    │
   │ (project_id UUID, loose)           │ (level=4 TASK_TEMPLATE)
   │                                    ▼
   │                              task_templates (1) ──────< work_items (N)
   │                                                              │
   ▼                                                              │ (polymorphic via work_item_type)
projects.id                                                        │
                                                                   ▼
          ┌───────────────┬──────────────────┬──────────────────┐
          │               │                  │                  │
  checklist_instances   incidents   energy_inspections   office_tasks
      │                    │                │
      ▼                    ▼                ▼
checklist_item_results  incident_photos  energy_readings
                           │                │
                           ▼                ▼
              incident_reopen_requests   energy_meters
              incident_assignee_change_requests
```

### 2.1 Bảng `master_plans`

```typescript
@Entity('master_plans')
@Index('IDX_MP_PROJECT_YEAR', ['project_id', 'year'], { unique: true })
export class MasterPlan {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 40, unique: true }) code: string;            // MP-VCQ7-2026
  @Column() name: string;
  @Column({ type: 'uuid' }) project_id: string;                   // loose FK → projects
  @Column() year: number;
  @Column({ type: 'date' }) start_date: Date;
  @Column({ type: 'date' }) end_date: Date;
  @Column({ type: 'enum', enum: MasterPlanStatus, default: DRAFT }) status: MasterPlanStatus;
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) total_budget: number;
  @Column({ type: 'uuid', nullable: true }) approved_by: string;
  @Column({ type: 'timestamptz', nullable: true }) approved_at: Date;
  @Column({ type: 'uuid' }) created_by: string;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
  @VersionColumn() version: number;                                // optimistic lock
  @OneToMany(() => WbsNode, n => n.plan) nodes: WbsNode[];
}
```

### 2.2 Bảng `wbs_nodes` (self-ref 5-level tree)

```typescript
@Entity('wbs_nodes')
@Index('IDX_WBS_PLAN_CODE', ['plan_id', 'wbs_code'], { unique: true })
@Index('IDX_WBS_PARENT', ['parent_id'])
export class WbsNode {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) plan_id: string;
  @ManyToOne(() => MasterPlan) @JoinColumn({ name: 'plan_id' }) plan: MasterPlan;
  @Column({ type: 'uuid', nullable: true }) parent_id: string;    // null = level 0
  @ManyToOne(() => WbsNode) @JoinColumn({ name: 'parent_id' }) parent: WbsNode;
  @Column({ length: 20 }) wbs_code: string;                        // "1.1.1.2"
  @Column({ type: 'smallint' }) level: number;                     // 0..5
  @Column({ type: 'enum', enum: WbsNodeType }) node_type: WbsNodeType;
  @Column() name: string;
  @Column({ type: 'int', default: 0 }) sort_order: number;
  @Column({ type: 'date', nullable: true }) planned_start: Date;
  @Column({ type: 'date', nullable: true }) planned_end: Date;
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) budget: number;
  @Column({ type: 'uuid', nullable: true }) responsible_user_id: string;
  @Column({ default: false }) is_archived: boolean;                // BR-MP-03
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}
```

### 2.3 Bảng `task_templates` (gắn vào level 4)

```typescript
@Entity('task_templates')
@Index('IDX_TT_NODE', ['wbs_node_id'])
@Index('IDX_TT_ACTIVE_TYPE', ['is_active', 'work_item_type'])      // recurrence scan
export class TaskTemplate {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) wbs_node_id: string;
  @ManyToOne(() => WbsNode) @JoinColumn({ name: 'wbs_node_id' }) wbs_node: WbsNode;
  @Column({ type: 'enum', enum: WorkItemType }) work_item_type: WorkItemType;
  @Column({ length: 200 }) recurrence_rule: string;                // RRULE RFC 5545
  @Column({ type: 'uuid', nullable: true }) template_ref_id: string;  // ChecklistTemplate.id nếu CHECKLIST
  @Column({ type: 'int', default: 24 }) sla_hours: number;
  @Column({ type: 'varchar', length: 100, nullable: true }) default_assignee_role: string;
  @Column({ default: true }) is_active: boolean;
  @Column({ type: 'date', nullable: true }) last_generated_date: Date;  // optimization scan
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}
```

### 2.4 Bảng `work_items` (POLYMORPHIC PARENT) — cốt lõi

```typescript
@Entity('work_items')
@Index('IDX_WI_PROJECT_DUE_STATUS', ['project_id', 'due_date', 'status'])
@Index('IDX_WI_ASSIGNEE_STATUS', ['assignee_id', 'status'])
@Index('IDX_WI_DEDUP', ['task_template_id', 'scheduled_date'], { unique: true, where: '"task_template_id" IS NOT NULL' })
// ↑ idempotency key cho recurrence engine — BR-MP-06
export class WorkItem {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'enum', enum: WorkItemType }) work_item_type: WorkItemType;
  @Column({ type: 'uuid', nullable: true }) subject_id: string;    // FK tới row cụ thể trong bảng con (nullable khi mới sinh)
  @Column({ type: 'uuid' }) project_id: string;
  @Column({ length: 200 }) title: string;
  @Column({ type: 'uuid' }) assignee_id: string;
  @Column({ type: 'uuid', nullable: true }) task_template_id: string;   // null nếu ad-hoc (Incident)
  @Column({ type: 'date', nullable: true }) scheduled_date: Date;        // idempotency
  @Column({ type: 'timestamptz' }) due_date: Date;
  @Column({ type: 'enum', enum: WorkItemStatus, default: NEW }) status: WorkItemStatus;
  @Column({ type: 'smallint', default: 0 }) progress_pct: number;        // 0..100
  @Column({ type: 'uuid', nullable: true }) parent_id: string;           // sub-task (slide 24)
  @ManyToOne(() => WorkItem) @JoinColumn({ name: 'parent_id' }) parent: WorkItem;
  @Column({ type: 'timestamptz', nullable: true }) completed_at: Date;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
  @VersionColumn() version: number;
}
```

**Ghi chú:** `subject_id` là **pointer mềm** (UUID, không hard FK) tới row trong `checklist_instances | incidents | energy_inspections | office_tasks`. Lý do: PostgreSQL không có polymorphic FK, và hard FK sẽ ép phải JOIN cả 4 bảng khi query feed → chậm. Ta dùng 2-phase: query `work_items` theo filter → hydrate chi tiết theo type khi cần drill-down.

### 2.5 Bảng `checklist_templates` + `checklist_item_templates`

```typescript
@Entity('checklist_templates')
export class ChecklistTemplate {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 40, unique: true }) code: string;              // CKL-HVAC-001
  @Column() name: string;
  @Column({ type: 'text', nullable: true }) description: string;
  @Column({ type: 'enum', enum: ChecklistFrequency }) frequency: ChecklistFrequency;
  @Column({ length: 50 }) asset_type: string;                       // "ELECTRIC"|"HVAC"|"FIRE"|...
  @Column({ type: 'varchar', length: 20, default: '1.0' }) doc_version: string;   // link docs/ module
  @Column({ default: true }) is_active: boolean;
  @OneToMany(() => ChecklistItemTemplate, i => i.template, { cascade: true }) items: ChecklistItemTemplate[];
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}

@Entity('checklist_item_templates')
@Index('IDX_CIT_TEMPLATE_ORDER', ['template_id', 'order_index'])
export class ChecklistItemTemplate {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) template_id: string;
  @ManyToOne(() => ChecklistTemplate) @JoinColumn({ name: 'template_id' }) template: ChecklistTemplate;
  @Column({ type: 'int' }) order_index: number;
  @Column() content: string;
  @Column({ type: 'enum', enum: ChecklistResultType }) result_type: ChecklistResultType;  // PASS_FAIL | VALUE | PHOTO_ONLY | MIXED
  @Column({ default: false }) require_photo: boolean;
  @Column({ length: 20, nullable: true }) value_unit: string;       // "kWh" | "°C" | "bar" | null
}
```

### 2.6 Bảng `checklist_instances` + `checklist_item_results`

```typescript
@Entity('checklist_instances')
@Index('IDX_CI_WORK_ITEM', ['work_item_id'], { unique: true })
export class ChecklistInstance {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) work_item_id: string;                   // back-ref tới work_items.id
  @Column({ type: 'uuid' }) template_id: string;
  @CreateDateColumn() created_at: Date;
  @Column({ type: 'timestamptz', nullable: true }) completed_at: Date;
  @OneToMany(() => ChecklistItemResult, r => r.instance) results: ChecklistItemResult[];
}

@Entity('checklist_item_results')
@Index('IDX_CIR_INSTANCE', ['instance_id'])
export class ChecklistItemResult {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) instance_id: string;
  @ManyToOne(() => ChecklistInstance) @JoinColumn({ name: 'instance_id' }) instance: ChecklistInstance;
  @Column({ type: 'uuid' }) item_template_id: string;
  @Column({ type: 'enum', enum: ChecklistResult }) result: ChecklistResult;  // PASS | FAIL | NA
  @Column({ type: 'decimal', precision: 18, scale: 3, nullable: true }) value: number;
  @Column({ type: 'jsonb', default: () => "'[]'" }) photos: PhotoEvidence[];  // {url, category, uploaded_at}
  @Column({ type: 'text', nullable: true }) notes: string;
  @Column({ type: 'timestamptz' }) checked_at: Date;
  @Column({ type: 'uuid' }) checked_by: string;
}
```

**Partition note (năm 3+):** nếu `checklist_item_results` > 2M rows, partition theo `RANGE(checked_at)` per-year. Không cần ngay Phase A.

### 2.7 Bảng `incidents` + children

```typescript
@Entity('incidents')
@Index('IDX_INC_PROJECT_STATUS', ['project_id', 'status'])
@Index('IDX_INC_CODE', ['incident_code'], { unique: true })
export class Incident {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 40 }) incident_code: string;                    // IC-260418-001
  @Column({ type: 'uuid' }) work_item_id: string;                   // back-ref
  @Column() title: string;
  @Column({ type: 'text' }) description: string;                     // BR-INC-01 ≥ 20 chars
  @Column({ type: 'uuid' }) project_id: string;
  @Column({ type: 'enum', enum: IncidentSeverity }) severity: IncidentSeverity;
  @Column({ type: 'enum', enum: IncidentCategory }) category: IncidentCategory;
  @Column({ length: 200, nullable: true }) location_text: string;
  @Column({ type: 'uuid', nullable: true }) related_asset_id: string;
  @Column({ type: 'uuid' }) reported_by: string;
  @Column({ type: 'uuid', nullable: true }) assigned_to: string;
  @Column({ type: 'enum', enum: IncidentStatus, default: NEW }) status: IncidentStatus;
  @Column({ type: 'timestamptz' }) reported_at: Date;
  @Column({ type: 'timestamptz', nullable: true }) assigned_at: Date;
  @Column({ type: 'timestamptz', nullable: true }) resolved_at: Date;
  @Column({ type: 'timestamptz', nullable: true }) closed_at: Date;
  @Column({ type: 'timestamptz', nullable: true }) due_date: Date;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}

@Entity('incident_photos')
export class IncidentPhoto {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) incident_id: string;
  @Column({ length: 500 }) url: string;                              // Cloudinary secure_url
  @Column({ type: 'enum', enum: PhotoCategory }) category: PhotoCategory;  // BEFORE_FIX | AFTER_FIX | EVIDENCE
  @Column({ type: 'uuid' }) uploaded_by: string;
  @CreateDateColumn() uploaded_at: Date;
}

@Entity('incident_reopen_requests')
export class IncidentReopenRequest {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) incident_id: string;
  @Column({ type: 'uuid' }) requested_by: string;
  @Column({ type: 'text' }) reason: string;                          // BR-INC-04 ≥ 10 chars
  @Column({ type: 'enum', enum: ApprovalStatus, default: PENDING }) status: ApprovalStatus;
  @Column({ type: 'uuid', nullable: true }) approved_by: string;
  @Column({ type: 'timestamptz', nullable: true }) approved_at: Date;
  @CreateDateColumn() created_at: Date;
}

@Entity('incident_assignee_change_requests')
export class IncidentAssigneeChangeRequest {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) incident_id: string;
  @Column({ type: 'uuid' }) requested_by: string;
  @Column({ type: 'uuid' }) current_assignee_id: string;
  @Column({ type: 'uuid' }) proposed_assignee_id: string;
  @Column({ type: 'text' }) reason: string;
  @Column({ type: 'enum', enum: ApprovalStatus, default: PENDING }) status: ApprovalStatus;
  @Column({ type: 'uuid', nullable: true }) approved_by: string;
  @CreateDateColumn() created_at: Date;
}

@Entity('incident_comments')
export class IncidentComment {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) incident_id: string;
  @Column({ type: 'uuid' }) actor_id: string;
  @Column({ type: 'text' }) comment: string;
  @CreateDateColumn() created_at: Date;
}
```

### 2.8 Bảng `energy_meters` + `energy_inspections` + `energy_readings`

```typescript
@Entity('energy_meters')
@Index('IDX_EM_PROJECT_CUSTOMER', ['project_id', 'customer_id'])
@Index('IDX_EM_CODE', ['meter_code'], { unique: true })
export class EnergyMeter {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 40 }) meter_code: string;
  @Column({ type: 'enum', enum: MeterType }) meter_type: MeterType;  // ELECTRIC | WATER | GAS
  @Column({ length: 20 }) unit: string;
  @Column({ type: 'uuid' }) project_id: string;
  @Column({ type: 'uuid', nullable: true }) customer_id: string;     // loose → customers/ module
  @Column({ length: 200, nullable: true }) location_text: string;
  @Column({ type: 'decimal', precision: 18, scale: 3, default: 0 }) baseline_value: number;
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 20 }) alert_threshold_pct: number;  // BR-ENR-02
  @Column({ default: true }) is_active: boolean;
  @CreateDateColumn() created_at: Date;
}

@Entity('energy_inspections')
export class EnergyInspection {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 40, unique: true }) inspection_code: string;     // EN-260418-001
  @Column({ type: 'uuid' }) work_item_id: string;
  @Column({ type: 'uuid' }) project_id: string;
  @Column({ type: 'text', nullable: true }) description: string;
  @CreateDateColumn() created_at: Date;
  @Column({ type: 'timestamptz', nullable: true }) completed_at: Date;
  @OneToMany(() => EnergyReading, r => r.inspection) readings: EnergyReading[];
}

@Entity('energy_readings')
@Index('IDX_ER_METER_TS', ['meter_id', 'reading_timestamp'])
export class EnergyReading {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) inspection_id: string;
  @ManyToOne(() => EnergyInspection) @JoinColumn({ name: 'inspection_id' }) inspection: EnergyInspection;
  @Column({ type: 'uuid' }) meter_id: string;
  @Column({ type: 'decimal', precision: 18, scale: 3 }) previous_reading: number;
  @Column({ type: 'decimal', precision: 18, scale: 3 }) current_reading: number;
  @Column({ type: 'decimal', precision: 18, scale: 3 }) delta: number;
  @Column({ length: 500 }) reading_photo_url: string;                // BR-ENR-03
  @Column({ type: 'timestamptz' }) reading_timestamp: Date;
  @Column({ type: 'text', nullable: true }) notes: string;
  @Column({ default: false }) is_meter_reset: boolean;                // BR-ENR-01 bypass
  @Column({ default: false }) alert_threshold_exceeded: boolean;
  @Column({ type: 'uuid', nullable: true }) auto_incident_id: string; // BR-ENR-02 link
  @CreateDateColumn() created_at: Date;
}
```

### 2.9 Bảng `office_tasks`

```typescript
@Entity('office_tasks')
@Index('IDX_OT_ASSIGNEE_STATUS', ['assignee_id', 'status'])
export class OfficeTask {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) work_item_id: string;
  @Column() title: string;
  @Column({ type: 'text' }) description: string;
  @Column({ type: 'enum', enum: OfficeTaskPriority, default: MEDIUM }) priority: OfficeTaskPriority;
  @Column({ type: 'jsonb', default: () => "'[]'" }) attachments: AttachmentRef[];
  @Column({ type: 'text', nullable: true }) completion_note: string;  // BR-OFC-01 ≥ 10 chars
  @CreateDateColumn() created_at: Date;
  @Column({ type: 'timestamptz', nullable: true }) completed_at: Date;
}
```

---

## 3. DOMAIN LOGIC (pure functions, 100% coverage bắt buộc — test-rules.md §2)

Tất cả đặt trong `<module>/domain/logic/` — KHÔNG import TypeORM/NestJS, dễ test isolation.

| File | Hàm chính | Test case tối thiểu |
|---|---|---|
| `rrule-parser.logic.ts` | `nextOccurrences(rrule: string, from: Date, to: Date): Date[]` | DAILY/WEEKLY/MONTHLY, exdate, BYDAY, invalid rule throw |
| `wbs-roll-up.logic.ts` | `rollUpProgress(children: WbsProgressData[]): WbsProgressData` | empty, all-complete, mixed, overdue |
| `budget-rollup.logic.ts` | `validateBudgetTree(parent, children): BudgetViolation[]` | sum children ≤ parent, exact match, overflow |
| `checklist-completion.logic.ts` | `computeInstanceStatus(results, itemsTotal): ChecklistStatus + progress_pct` | 0%, 50%, 100% auto-COMPLETED, có FAIL vẫn COMPLETED |
| `incident-severity.logic.ts` | `shouldBypassWorkHours(severity): boolean` | CRITICAL=true, others=false |
| `incident-reopen-policy.logic.ts` | `canReopen(status): boolean` | COMPLETED=true, others=false |
| `energy-delta.logic.ts` | `computeDelta(prev, curr, meterReset, baseline, thresholdPct): {delta, exceeded, shouldAutoIncident}` | normal, meter reset bypass, threshold exceeded |
| `sla-overdue.logic.ts` | `isOverdue(dueDate, now): boolean` + `overdueHours(due, now)` | before/after due, same second |
| `office-task-overdue.logic.ts` | `nextReminderAt(dueDate, lastReminderAt): Date` | first reminder, every 24h pattern |

**Nguyên tắc Cấm Fat Service (sa-rules.md #4):** service ở tầng application CHỈ orchestrate — tính toán nghiệp vụ nặng (percentage, threshold, state transition) PHẢI ở domain/logic.

---

## 4. RECURRENCE ENGINE — BULL QUEUE DESIGN

### 4.1 Kiến trúc

```
[Cron @Cron('0 0 * * *')]                      # daily 00:00 VN time
    │ (RecurrenceProducer.enqueueDailyScan)
    ▼
[Bull Queue: "master-plan-recurrence-scan"]   (Upstash Redis)
    │
    ▼
[RecurrenceProcessor.handleDailyScan]          # worker concurrency = 4
    │  1. SELECT task_templates WHERE is_active=true AND
    │     (last_generated_date IS NULL OR last_generated_date < today)
    │  2. For each template:
    │     a. parse recurrence_rule
    │     b. compute shouldGenerateToday(today)
    │     c. if yes: enqueue "generate-work-item" job (1 per template)
    │
    ▼
[Bull Queue: "master-plan-generate-item"]
    │
    ▼
[RecurrenceProcessor.handleGenerate]           # worker concurrency = 8
    │  In single transaction:
    │    INSERT INTO work_items (task_template_id, scheduled_date=today, ...)
    │    ON CONFLICT (task_template_id, scheduled_date) DO NOTHING   ← idempotent
    │    ─▶ if ok: dispatch createSubjectRow(work_item_type) (creates ChecklistInstance / OfficeTask / EnergyInspection)
    │    ─▶ update task_templates.last_generated_date = today
    │
    ▼
[Bull Queue: "work-item-notification"]         # sau khi sinh, enqueue notify
    │  peak 07:00 AM → push web + email "7h sáng hôm nay"
```

### 4.2 Retry & Idempotency

- Bull job options: `attempts: 3, backoff: { type: 'exponential', delay: 5000 }`.
- Idempotency DB-level: unique index `(task_template_id, scheduled_date)` trên `work_items` → ON CONFLICT DO NOTHING.
- Idempotency job-level: `jobId: "gen-${template_id}-${YYYY-MM-DD}"` — Bull skip duplicate.
- Failure alert: failed job > 3 attempts → log to `shared/audit` + Slack webhook (optional env `RECURRENCE_ALERT_WEBHOOK`).

### 4.3 Tại sao Bull + Redis (Upstash) thay vì `@nestjs/schedule` in-process?

| Tiêu chí | `@nestjs/schedule` | Bull + Upstash |
|---|---|---|
| Multi-instance safe | ❌ (mỗi replica chạy cron, duplicate) | ✅ (job locked per consumer) |
| Retry nếu fail | ❌ | ✅ 3 attempts |
| Visibility (queue length, failed jobs) | ❌ | ✅ Bull Board UI |
| Horizontal scale | ❌ | ✅ worker n replicas |
| Cost Upstash free tier | — | ✅ 10K commands/day đủ 270 jobs/ngày |

### 4.4 RRULE library choice

`rrule@2.8` (MIT, standalone, không deps nặng). Đã có TypeScript types. Wrap trong `rrule-parser.logic.ts` để không lộ dependency ra ngoài module.

---

## 5. API ENDPOINTS + PRIVILEGE MATRIX

### 5.1 Privileges mới cần seed (migration + seed script)

```typescript
// wms-backend/src/auth/enums/privilege.enum.ts — APPEND
// ── MASTER PLAN ──
VIEW_MASTER_PLAN = 'VIEW_MASTER_PLAN',
MANAGE_MASTER_PLAN = 'MANAGE_MASTER_PLAN',
APPROVE_MASTER_PLAN = 'APPROVE_MASTER_PLAN',

// ── WORK ITEM / CHECKLIST ──
VIEW_WORK_ITEM = 'VIEW_WORK_ITEM',
EXECUTE_WORK_ITEM = 'EXECUTE_WORK_ITEM',              // generic: tick item, save result
MANAGE_CHECKLIST_TEMPLATE = 'MANAGE_CHECKLIST_TEMPLATE',
EXECUTE_CHECKLIST = 'EXECUTE_CHECKLIST',              // alias — field worker

// ── INCIDENT ──
REPORT_INCIDENT = 'REPORT_INCIDENT',                  // tạo mới
VIEW_INCIDENT = 'VIEW_INCIDENT',
ASSIGN_INCIDENT = 'ASSIGN_INCIDENT',                  // QLDA giao việc
RESOLVE_INCIDENT = 'RESOLVE_INCIDENT',                // NVKT mark resolved
CLOSE_INCIDENT = 'CLOSE_INCIDENT',                    // QLDA xác nhận completed
APPROVE_INCIDENT_REOPEN = 'APPROVE_INCIDENT_REOPEN',
APPROVE_ASSIGNEE_CHANGE = 'APPROVE_ASSIGNEE_CHANGE',
EXPORT_INCIDENT = 'EXPORT_INCIDENT',

// ── ENERGY ──
MANAGE_ENERGY_METER = 'MANAGE_ENERGY_METER',
EXECUTE_ENERGY_INSPECTION = 'EXECUTE_ENERGY_INSPECTION',
EXPORT_ENERGY_REPORT = 'EXPORT_ENERGY_REPORT',

// ── OFFICE TASK ──
MANAGE_OFFICE_TASK = 'MANAGE_OFFICE_TASK',
EXECUTE_OFFICE_TASK = 'EXECUTE_OFFICE_TASK',
```

Tổng: **18 privileges mới**.

### 5.2 Route matrix

| Method | Route | Controller | Privilege | Ghi chú |
|---|---|---|---|---|
| **Master Plan** | | | | |
| POST | `/master-plan` | MasterPlanController.create | MANAGE_MASTER_PLAN | BR-MP-01 |
| GET | `/master-plan` | list (paginated, filter project/year/status) | VIEW_MASTER_PLAN | |
| GET | `/master-plan/:id` | findOne + WBS tree | VIEW_MASTER_PLAN | Query N+1 safe bằng materialized tree |
| PATCH | `/master-plan/:id` | update | MANAGE_MASTER_PLAN | Block nếu status=ACTIVE cho 1 số field |
| POST | `/master-plan/:id/approve` | approve → gọi BudgetService.checkBudgetLimit | APPROVE_MASTER_PLAN | BR-MP-02 |
| POST | `/master-plan/:id/close` | close plan → stop recurrence | MANAGE_MASTER_PLAN | BR-MP-07 |
| POST | `/master-plan/:id/clone` | clone từ năm trước | MANAGE_MASTER_PLAN | tiện lợi US-MP-01 |
| **WBS Node** | | | | |
| POST | `/master-plan/:planId/wbs-nodes` | create | MANAGE_MASTER_PLAN | BR-MP-04 budget validate |
| PATCH | `/master-plan/wbs-nodes/:id` | update | MANAGE_MASTER_PLAN | |
| POST | `/master-plan/wbs-nodes/:id/archive` | soft delete | MANAGE_MASTER_PLAN | BR-MP-03 |
| GET | `/master-plan/:planId/wbs-tree` | toàn cây (single query recursive CTE) | VIEW_MASTER_PLAN | |
| GET | `/master-plan/:planId/dashboard` | KPI roll-up | VIEW_MASTER_PLAN | US-MP-06 |
| **Task Template** | | | | |
| POST | `/master-plan/wbs-nodes/:nodeId/task-templates` | attach | MANAGE_MASTER_PLAN | |
| PATCH | `/master-plan/task-templates/:id` | toggle active, edit recurrence | MANAGE_MASTER_PLAN | |
| DELETE | `/master-plan/task-templates/:id` | disable | MANAGE_MASTER_PLAN | |
| POST | `/master-plan/task-templates/:id/preview` | dry-run → list 10 next scheduled_date | MANAGE_MASTER_PLAN | UX helper |
| **Work Item (polymorphic feed)** | | | | |
| GET | `/work-items/feed` | daily feed filter (type, status, date range, my) | VIEW_WORK_ITEM | Slide 18-24 |
| GET | `/work-items/:id` | detail polymorphic (hydrate subject) | VIEW_WORK_ITEM | |
| POST | `/work-items/:id/reassign` | đổi assignee | MANAGE_MASTER_PLAN | Audit trail |
| **Checklist Template** | | | | |
| GET | `/checklist-templates` | list | VIEW_MASTER_PLAN | |
| POST | `/checklist-templates` | create + items | MANAGE_CHECKLIST_TEMPLATE | |
| PATCH | `/checklist-templates/:id` | update (bump doc_version) | MANAGE_CHECKLIST_TEMPLATE | |
| POST | `/checklist-templates/:id/clone` | clone | MANAGE_CHECKLIST_TEMPLATE | |
| **Checklist Instance** | | | | |
| GET | `/checklist-instances/:id` | detail | VIEW_WORK_ITEM | |
| POST | `/checklist-instances/:id/results` | record 1 item result | EXECUTE_CHECKLIST | BR-CHK-01/02/05, auto transition |
| PATCH | `/checklist-instances/:id/results/:resultId` | sửa trước khi instance COMPLETED | EXECUTE_CHECKLIST | |
| POST | `/checklist-instances/:id/complete` | force-complete (admin override) | MANAGE_MASTER_PLAN | edge case |
| GET | `/checklist-instances/export/xlsx` | export multi-record | EXPORT_INVENTORY + VIEW_WORK_ITEM | slide 52-57 |
| **Incident** | | | | |
| POST | `/incidents` | create (ad-hoc, ngoài MasterPlan) | REPORT_INCIDENT | BR-INC-01 |
| GET | `/incidents` | list filter | VIEW_INCIDENT | |
| GET | `/incidents/:id` | detail + photos + comments | VIEW_INCIDENT | |
| PATCH | `/incidents/:id/assign` | QLDA giao việc (status → IN_PROGRESS) | ASSIGN_INCIDENT | |
| POST | `/incidents/:id/photos` | upload ảnh evidence (before/after) | REPORT_INCIDENT \| RESOLVE_INCIDENT | Cloudinary |
| POST | `/incidents/:id/comments` | add comment | VIEW_INCIDENT | audit trail |
| POST | `/incidents/:id/resolve` | NVKT báo fixed | RESOLVE_INCIDENT | BR-INC-05 gate |
| POST | `/incidents/:id/close` | QLDA xác nhận COMPLETED | CLOSE_INCIDENT | kiểm AFTER_FIX photos |
| POST | `/incidents/:id/reopen-requests` | user yêu cầu mở lại | VIEW_INCIDENT | BR-INC-03 |
| POST | `/incident-reopen-requests/:id/approve` | QLDA duyệt | APPROVE_INCIDENT_REOPEN | |
| POST | `/incident-reopen-requests/:id/reject` | QLDA từ chối | APPROVE_INCIDENT_REOPEN | |
| POST | `/incidents/:id/assignee-change-requests` | NVKT xin chuyển | ASSIGN_INCIDENT | |
| POST | `/incident-assignee-change-requests/:id/approve` | QLDA duyệt | APPROVE_ASSIGNEE_CHANGE | |
| GET | `/incidents/:id/export` | .docx per-incident (before/after + timeline) | EXPORT_INCIDENT | slide 36 |
| **Energy** | | | | |
| POST | `/energy/meters` | create | MANAGE_ENERGY_METER | |
| GET | `/energy/meters` | list | VIEW_WORK_ITEM | |
| PATCH | `/energy/meters/:id` | edit (baseline, threshold) | MANAGE_ENERGY_METER | |
| GET | `/energy/inspections/:id` | detail + readings | VIEW_WORK_ITEM | |
| POST | `/energy/inspections/:id/readings` | record 1 reading (multi-meter nhưng mỗi request 1) | EXECUTE_ENERGY_INSPECTION | BR-ENR-01/02/03 |
| GET | `/energy/reports/export` | .docx filter theo date/project/customer/type | EXPORT_ENERGY_REPORT | slide 69-71 |
| **Office Task** | | | | |
| POST | `/office-tasks` | create (ad-hoc hoặc qua MasterPlan) | MANAGE_OFFICE_TASK | |
| PATCH | `/office-tasks/:id` | update | MANAGE_OFFICE_TASK \| EXECUTE_OFFICE_TASK (self) | |
| POST | `/office-tasks/:id/complete` | mark DONE (yêu cầu completion_note) | EXECUTE_OFFICE_TASK | BR-OFC-01 |

**Tổng: 46 endpoints** (10 Master Plan/WBS/TaskTemplate + 3 WorkItem + 4 ChecklistTemplate + 5 ChecklistInstance + 12 Incident + 6 Energy + 3 OfficeTask + 3 Export).

### 5.3 DTO convention

- Mọi DTO dùng `class-validator` + `@ApiProperty` cho Swagger.
- `StripEmptyStringsPipe` + `ValidationPipe(whitelist:true, forbidNonWhitelisted:true)` global — không cần decorator lặp.
- Update DTO dùng `PartialType` từ `@nestjs/swagger` (không phải `@nestjs/mapped-types`) — tuân wms-backend/CLAUDE.md §8.3.

Ví dụ cốt lõi:

```typescript
// master-plan/dto/create-task-template.dto.ts
export class CreateTaskTemplateDto {
  @ApiProperty({ enum: WorkItemType }) @IsEnum(WorkItemType) work_item_type: WorkItemType;
  @ApiProperty({ example: 'FREQ=WEEKLY;BYDAY=MO' }) @IsString() @Matches(/^FREQ=/) recurrence_rule: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() template_ref_id?: string;
  @ApiProperty({ example: 24 }) @IsInt() @Min(1) @Max(720) sla_hours: number;
  @ApiPropertyOptional() @IsOptional() @IsString() default_assignee_role?: string;
}

// checklists/dto/record-item-result.dto.ts
export class RecordItemResultDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() item_template_id: string;
  @ApiProperty({ enum: ChecklistResult }) @IsEnum(ChecklistResult) result: ChecklistResult;
  @ApiPropertyOptional() @IsOptional() @IsNumber() value?: number;
  @ApiPropertyOptional({ type: [PhotoEvidenceDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PhotoEvidenceDto) photos?: PhotoEvidenceDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}
```

---

## 6. INTEGRATION CONTRACTS (với modules đã DONE)

### 6.1 `projects/` (loose — UUID string)

- `master_plans.project_id` → `projects.id` (UUID, không hard FK vì tránh circular + migration order).
- Validation: khi create MP → call `ProjectsService.exists(project_id)` ở tầng service, không ở migration.

### 6.2 `approvals/` (reuse sub-flow)

**Lựa chọn:** tự viết `IncidentReopenRequest` và `IncidentAssigneeChangeRequest` — KHÔNG dùng generic `approvals/` module vì:
1. 2 flow này có schema rất cụ thể (reason, proposed_assignee_id) — generic approval không fit.
2. State machine 3 trạng thái đơn giản, không cần workflow engine.
3. Cross-module reference giữ loose.

Tuy nhiên **reuse** `ApprovalStatus` enum từ `approvals/enums/approval.enum.ts` để tránh duplicate.

### 6.3 `documents/` (version control ChecklistTemplate)

- ChecklistTemplate có field `doc_version` (string "1.0"). Khi admin update template, bump lên "1.1", và tạo 1 document entry trong `documents/` với `doc_type=CHECKLIST_TEMPLATE` (enum mới cần add).
- Tái sử dụng: `DocumentVersionsService.createVersion(…)` — chỉ gọi optionally khi user check "Save as document version".
- **Phase A đơn giản:** field string + audit log trong `checklist_templates`. Phase B mới link full documents/.

### 6.4 `cloud-storage/` (ảnh evidence)

- Reuse `CloudStorageService.uploadImage(buffer, folder)` — folder convention:
  - `master-plan/checklists/{instance_id}/`
  - `master-plan/incidents/{incident_code}/`
  - `master-plan/energy/{inspection_code}/`
- Mỗi ảnh **≤ 10MB**, **max 10/instance** (tương tự NCR policy hiện hữu).
- Phase A **bỏ qua** yêu cầu "chụp trực tiếp" (mobile-only trong HDSD) vì web-only — sẽ validate ở Phase B khi có mobile.

### 6.5 `BudgetService.checkBudgetLimit()` (BR-MP-04)

- Khi approve MP → gọi `BudgetService.checkBudgetLimit(plan_id, total_budget)`.
- Khi tạo/update WbsNode với `budget > 0` → validate sum con ≤ cha bằng `budget-rollup.logic.ts` TRƯỚC khi commit transaction.

### 6.6 `employees/` (assignee resolution)

- `work_items.assignee_id` → UUID của `users.id` (không phải `employees.id`, vì login là user).
- Mapping role field worker → JWT role: QLDA/NVKT/Bảo vệ. Guard dùng `privilege` chứ không check role string (RBAC chuẩn).
- `default_assignee_role` trong TaskTemplate là **text** để admin assign manual khi sinh instance — engine sẽ lấy user đầu tiên trong role hoặc để NULL + notify admin.

### 6.7 `shared/audit/` (audit trail per-entity)

- Reuse pattern từ `documents/document-audit.service.ts`. Tạo `master_plan_audit_logs` riêng (append-only) với `entity_type` + `entity_id` + `action` + `actor_id` + `before_json` + `after_json`.
- Trigger ở service layer (không dùng DB trigger — khó debug).

---

## 7. TRANSACTION BOUNDARIES (BẮT BUỘC — wms-backend/CLAUDE.md §6)

| Thao tác | Lý do transaction | Rollback khi |
|---|---|---|
| `MasterPlan.approve` | approve + updateAudit + BudgetService lock | 1 trong 3 fail |
| `WbsNode.archive` | archive + cascade (check no-instance) | có instance đang NEW |
| `RecurrenceEngine.generate` | insert work_items + insert subject row + update template.last_generated_date | unique violation → skip gracefully (not rollback, đây là idempotent) |
| `Checklist.recordResult` | insert result + compute status + update work_item.progress_pct + auto-transition to COMPLETED nếu 100% | |
| `Incident.resolve` | update status + insert AFTER_FIX photo ref + notify QLDA | thiếu photo |
| `Incident.close` | update status=COMPLETED + close work_item | không có AFTER_FIX photo (BR-INC-05) |
| `Incident.reopen-approve` | approve request + reset incident status=NEW + re-create work_item (cascade) | |
| `Energy.recordReading` | insert reading + nếu threshold exceeded → insert Incident + link auto_incident_id | |

Dùng `DataSource.transaction(async manager => {...})` pattern — không dùng decorator vì khó trace.

---

## 8. MIGRATION PLAN

**Số migration:** 2 file (split để giảm risk + deploy incremental)

### 8.1 `1776300000000-MasterPlanSchema.ts` (core)

- Create enum types: `master_plan_status`, `wbs_node_type`, `work_item_type`, `work_item_status`, `checklist_frequency`, `checklist_result_type`, `checklist_result`, `photo_category`, `incident_severity`, `incident_category`, `incident_status`, `meter_type`, `office_task_priority`, `approval_status` (nếu chưa có).
- Tạo tables: `master_plans`, `wbs_nodes`, `task_templates`, `work_items`, `checklist_templates`, `checklist_item_templates`, `checklist_instances`, `checklist_item_results`, `incidents`, `incident_photos`, `incident_comments`, `incident_reopen_requests`, `incident_assignee_change_requests`, `energy_meters`, `energy_inspections`, `energy_readings`, `office_tasks`.
- Index: xem §2.
- Unique: `work_items(task_template_id, scheduled_date) WHERE task_template_id IS NOT NULL`.
- **KHÔNG** hard FK xuyên module (project_id, customer_id, assignee_id, reported_by = UUID không có REFERENCES).

### 8.2 `1776300000001-MasterPlanPrivilegesSeed.ts`

- INSERT 18 privileges mới vào `privileges` (code + name_vi + description).
- KHÔNG gán vào role tự động — user seed thủ công qua script hoặc SQL trong dashboard (giống pattern Sales đã làm).

**Ghi chú deploy (deploy-rules.md):**
- Migration chạy trên Neon production — verify `connection error` + `routing fallback` sau deploy.
- Tái dùng checklist §5 trong DEPLOY.md hiện hữu.
- **Zero-downtime:** tất cả CREATE TABLE + CREATE INDEX đều safe (không ALTER bảng hiện hữu).
- Rollback script: `DROP TABLE ... CASCADE` thứ tự ngược (office_tasks → energy_readings → ... → master_plans).

---

## 9. NON-FUNCTIONAL / PERFORMANCE

| Yêu cầu | Giải pháp |
|---|---|
| Feed "Công việc của tôi" < 300ms p95 | Index `IDX_WI_ASSIGNEE_STATUS` + limit 50 + cursor pagination |
| Dashboard WBS roll-up < 1s | Materialized view `mv_wbs_progress` refresh daily (hoặc recursive CTE nếu MV overkill cho 20 tòa) — **Phase A: recursive CTE**, MV nếu chậm |
| Recurrence scan < 5 phút | Bull concurrency=4 + `last_generated_date` filter để skip template đã sinh hôm nay |
| Export .docx per-incident < 3s | `docx` npm package (streaming), tối đa 10 ảnh thumbnail |
| Checklist item result insert < 100ms | Simple insert, no heavy join |

---

## 10. SECURITY CHECKLIST (sa-rules.md + dev-rules.md)

- [x] Mọi controller có `@UseGuards(JwtAuthGuard, PrivilegeGuard)` class-level
- [x] Write operation có `@RequirePrivilege(…)` method-level
- [x] DTO validation bắt buộc (`@IsXxx`, `@ValidateNested` cho nested)
- [x] Upload ảnh: validate mime (image/jpeg, image/png), size ≤ 10MB, count ≤ 10 — reuse guard NCR
- [x] SQL injection: dùng TypeORM parameterized query — không raw SQL trừ migration
- [x] N+1 protection: dùng `.leftJoinAndSelect` hoặc `.relations` khi fetch tree
- [x] Response wrap `{ status, message, data }` qua GlobalExceptionFilter hiện hữu
- [x] Swagger: `@ApiTags` + `@ApiBearerAuth('bearer')` + `@ApiOperation` per endpoint

---

## 11. CROSS-STACK FRONTEND IMPACT (wms-backend/CLAUDE.md §11)

Các interface/type frontend cần tạo mới trong `wms-frontend/src/entities/`:

```
entities/
  master-plan/              # MasterPlan, WbsNode, TaskTemplate types + hooks
  work-item/                # WorkItem polymorphic + feed hook
  checklist/                # ChecklistTemplate, ChecklistInstance, Result types
  incident/                 # Incident + Reopen + AssigneeChange types
  energy/                   # Meter, Inspection, Reading types
  office-task/              # OfficeTask types
```

+ Enum mirror trong `wms-frontend/src/shared/enums/` cho tất cả enum mới.
+ Privilege constants trong `wms-frontend/src/shared/auth/privileges.ts` — thêm 18 giá trị.
+ Sidebar section mới "Master Plan" (gộp 4 module con dưới).
+ 5 pages Phase A: `MasterPlansListPage`, `MasterPlanDetailPage` (tabs: Overview | WBS | Templates | Dashboard | Instances), `MyWorkItemsPage` (feed), `IncidentsPage`, `EnergyMetersPage`.

**UI không làm trong Phase A:** mobile (HDSD native), offline, camera-direct enforcement — xem BA_SPEC §6.

---

## 12. TESTING STRATEGY (test-rules.md)

| Loại test | Scope | Target coverage |
|---|---|---|
| Unit — domain/logic | 9 pure function files | 100% |
| Unit — service | RecurrenceEngine idempotency, ChecklistResult auto-transition, EnergyReading threshold | ≥ 80% |
| Integration (supertest) | Happy path cho 8 US, + 2 sub-flow approval, + 1 budget overflow (BR-MP-04) | ≥ 5 flow |
| E2E | Manual verification theo test-rules.md §Manual Verification Check | Bước 1-4 full |

**Test ước tính:** 60-80 test mới (matched với Sales module scale đã PASS 48/48).

---

## 13. RISK & MITIGATION

| Rủi ro | Ảnh hưởng | Mitigation |
|---|---|---|
| Polymorphic `work_items.subject_id` inconsistent (orphan row) | Query fail khi hydrate | Hard rule: tạo work_item + subject trong CÙNG transaction |
| Bull Queue backup khi Redis down | Recurrence không sinh instance | Retry + alert webhook; fallback: admin có nút "Run scan now" để force-generate |
| WBS tree query deep level 5 chậm với 100 template/tòa × 20 tòa = 2000 leaf | Dashboard lag | Recursive CTE với limit depth + materialized view từ năm 2 |
| Unique constraint (task_template_id, scheduled_date) conflict khi clone plan | Dup key error | clone logic phải set task_template_id=NEW, không share id |
| Cloudinary free tier block .pdf/.zip (memory note) | Ảnh upload OK vì jpg/png — không impact | — |

---

## 14. CHECKLIST HOÀN THÀNH GATE 2 (theo sa-rules.md)

- [x] ERD + quan hệ Database xác định (§2 — 17 entities, unique/btree/GIN indexes)
- [x] API Endpoints liệt kê (§5.2 — 46 endpoints)
- [x] Interface + DTO định nghĩa (§5.3 + §2 entity fields)
- [x] Clean Architecture folder structure rõ ràng (§1)
- [x] Tối ưu truy vấn ITD/PTD (§9 — index, CTE, MV roadmap)
- [x] Dependency map với modules đã DONE (§6)
- [x] Recurrence engine design (§4 — Bull + Redis + retry + idempotency)
- [x] Migration plan zero-downtime (§8)
- [x] Privilege matrix (§5.1 — 18 privileges mới)
- [x] Transaction boundaries (§7)
- [x] Cross-stack frontend impact liệt kê (§11)
- [x] Domain logic (pure functions) tách riêng (§3 — 9 files)
- [x] Security checklist (§10)
- [x] Risk assessment (§13)

---

**Gate 2 STATUS:** ✅ **APPROVED (2026-04-18) — Ready for Gate 3 DEV**

**Clarifications đã chốt:**

1. ✅ **Module split:** 6 top-level (`master-plan/`, `work-items/`, `checklists/`, `incidents/`, `energy-inspection/`, `office-tasks/`).
2. 🟡 **Bull Queue infra:** Upstash Redis CHƯA có account — Duy sẽ tạo theo hướng dẫn setup (xem docs riêng). Env cần thêm: `REDIS_URL` (native TCP, không REST).
3. ✅ **Worker co-location:** Phase A chạy Bull worker cùng web service trên Render (tiết kiệm chi phí). Phase B tách khi > 5K jobs/ngày.
4. ✅ **Privilege granularity:** giữ 18 privileges fine-grained — không gộp, đổi lấy khả năng phân quyền chi tiết.
5. ✅ **Sub-flow approval:** tự viết `IncidentReopenRequest` + `IncidentAssigneeChangeRequest` (reuse `ApprovalStatus` enum từ `approvals/` để tránh duplicate).

**Next gate:** Gate 3 DEV — implementation theo folder map §1, bắt đầu bằng:
- B1: migration + entities + enums + privileges seed
- B2: domain/logic (pure functions) + unit test 100%
- B3: Master Plan + WbsNode + TaskTemplate (CRUD cốt lõi)
- B4: Recurrence engine (Bull + RRULE parser)
- B5: Checklists module (template + instance + result + auto-transition)
- B6: Work Items feed API + notification service
- B7: Incidents (+ 2 sub-flow)
- B8: Energy Inspection (+ auto-incident threshold)
- B9: Office Tasks
- B10: Export (.docx/.xlsx) + Dashboard KPI roll-up
- B11: Frontend entities + pages (Phase A web)

Ước tính Gate 3: **8-10 phiên làm việc** (giống Sales module scale).
