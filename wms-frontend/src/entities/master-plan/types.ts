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
  work_item_type: 'CHECKLIST' | 'INCIDENT' | 'ENERGY_INSPECTION' | 'OFFICE_TASK'
  recurrence_rule: string
  sla_hours: number
  template_ref_id: string | null
  default_assignee_role: string | null
  is_active: boolean
  last_generated_date: string | null
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
}
