export const MasterPlanStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  CLOSED: 'CLOSED',
} as const
export type MasterPlanStatus = (typeof MasterPlanStatus)[keyof typeof MasterPlanStatus]

export const MASTER_PLAN_STATUS_LABELS: Record<MasterPlanStatus, string> = {
  DRAFT: 'Nháp',
  ACTIVE: 'Đang chạy',
  CLOSED: 'Đã đóng',
}

export const WbsNodeType = {
  WORKSTREAM: 'WORKSTREAM',
  SYSTEM: 'SYSTEM',
  WORK_PACKAGE: 'WORK_PACKAGE',
  TASK_TEMPLATE: 'TASK_TEMPLATE',
} as const
export type WbsNodeType = (typeof WbsNodeType)[keyof typeof WbsNodeType]

export const WBS_NODE_TYPE_LABELS: Record<WbsNodeType, string> = {
  WORKSTREAM: 'Luồng công việc',
  SYSTEM: 'Hệ thống',
  WORK_PACKAGE: 'Gói công việc',
  TASK_TEMPLATE: 'Template',
}

// ── Supplement 2026-04-20 ────────────────────────────────────
export const ExecutorParty = {
  INTERNAL: 'INTERNAL',
  OWNER: 'OWNER',
  TENANT: 'TENANT',
  CONTRACTOR: 'CONTRACTOR',
  MIXED: 'MIXED',
} as const
export type ExecutorParty = (typeof ExecutorParty)[keyof typeof ExecutorParty]

export const EXECUTOR_PARTY_LABELS: Record<ExecutorParty, string> = {
  INTERNAL: 'Nội bộ (IMPC)',
  OWNER: 'Chủ đầu tư (BW)',
  TENANT: 'Khách thuê',
  CONTRACTOR: 'Nhà thầu độc lập',
  MIXED: 'Đồng thực hiện',
}

export const FREQ_CODES = ['D', 'W', 'BW', 'M', 'Q', 'BiQ', 'HY', 'Y', 'Y_URGENT'] as const
export type FreqCode = (typeof FREQ_CODES)[number]

export const FREQ_CODE_LABELS: Record<FreqCode, string> = {
  D: 'Hàng ngày',
  W: 'Hàng tuần',
  BW: '2 tuần/lần',
  M: 'Hàng tháng',
  Q: 'Quý',
  BiQ: '4 tháng/lần',
  HY: '6 tháng',
  Y: 'Hàng năm',
  Y_URGENT: 'Hàng năm + ad-hoc',
}

export interface MasterPlan {
  id: string
  code: string
  name: string
  year: number
  project_id: string
  budget_vnd: string
  status: MasterPlanStatus
  start_date: string | null
  end_date: string | null
  approved_by: string | null
  approved_at: string | null
  // Supplement 2026-04-20
  prepared_by_id: string | null
  prepared_at: string | null
  location_label: string | null
  created_at: string
  updated_at: string
}

export interface WbsNode {
  id: string
  plan_id: string
  parent_id: string | null
  wbs_code: string
  name: string
  level: number
  node_type: WbsNodeType
  budget_vnd: string
  sort_order: number
  start_date: string | null
  end_date: string | null
  responsible_employee_id: string | null
  is_archived: boolean
  version: number
  created_at: string
  updated_at: string
}

export interface TaskTemplate {
  id: string
  wbs_node_id: string
  name: string
  name_en: string | null
  work_item_type: 'CHECKLIST' | 'INCIDENT' | 'ENERGY_INSPECTION' | 'OFFICE_TASK'
  recurrence_rule: string
  sla_hours: number
  template_ref_id: string | null
  default_assignee_role: string | null
  is_active: boolean
  last_generated_date: string | null
  // Supplement 2026-04-20
  system_id: string | null
  equipment_item_id: string | null
  executor_party: ExecutorParty
  contractor_name: string | null
  freq_code: FreqCode | null
  regulatory_refs: string[]
  allow_adhoc_trigger: boolean
  created_at: string
  updated_at: string
}

export interface CreateMasterPlanPayload {
  code: string
  name: string
  year: number
  project_id: string
  budget_vnd?: string
  start_date?: string
  end_date?: string
}

export type UpdateMasterPlanPayload = Partial<CreateMasterPlanPayload>

export interface CreateWbsNodePayload {
  parent_id?: string
  wbs_code: string
  name: string
  level: number
  node_type: WbsNodeType
  budget_vnd?: string
  sort_order?: number
  start_date?: string
  end_date?: string
  responsible_employee_id?: string
}

export interface UpdateWbsNodePayload {
  name?: string
  budget_vnd?: string
  start_date?: string
  end_date?: string
  responsible_employee_id?: string
}

export interface CreateTaskTemplatePayload {
  name: string
  work_item_type: TaskTemplate['work_item_type']
  recurrence_rule: string
  sla_hours: number
  template_ref_id?: string
  default_assignee_role?: string
  is_active?: boolean
  // Supplement 2026-04-20
  name_en?: string
  system_id?: string
  equipment_item_id?: string
  executor_party: ExecutorParty
  contractor_name?: string
  freq_code?: FreqCode
  regulatory_refs?: string[]
  allow_adhoc_trigger?: boolean
}

// Supplement: MasterPlan update + sign-off
export interface UpdateMasterPlanSignOffPayload {
  prepared_by_id?: string
  prepared_at?: string
  location_label?: string
}
