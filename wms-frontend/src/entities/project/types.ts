export type ProjectStage = 'PLANNING' | 'PERMITTING' | 'CONSTRUCTION' | 'MANAGEMENT'
export type ProjectStatus = 'DRAFT' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELED'
export type AssignmentRole = 'PROJECT_MANAGER' | 'MEMBER'
export type WbsStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED'

export interface Project {
  id: string
  project_code: string
  project_name: string
  description: string | null
  organization_id: string | null
  organization: {
    id: string
    organization_code: string
    organization_name: string
  } | null
  stage: ProjectStage
  status: ProjectStatus
  location: string | null
  gfa_m2: number | null
  investor_id: string | null
  investor: { id: string; supplier_code: string; name: string } | null
  manager_id: string | null
  manager: { id: string; employee_code: string; full_name: string } | null
  department_id: string | null
  department: { id: string; organization_code: string; organization_name: string } | null
  budget: number | null
  created_at: string
  updated_at: string
}

export interface ProjectAssignment {
  id: string
  project_id: string
  employee_id: string
  role: AssignmentRole
  project: Project
  employee: {
    id: string
    employee_code: string
    full_name: string
    email: string | null
    phone: string | null
    status: string
    department: {
      id: string
      organization_code: string
      organization_name: string
    } | null
  }
  created_at: string
}

// ── Cost Management ──

export interface CostCategory {
  id: string
  code: string
  name: string
  description: string | null
  created_at: string
}

export interface ProjectBudget {
  id: string
  project_id: string
  category_id: string
  category: CostCategory
  planned_amount: number
  currency: string
  notes: string | null
}

export interface ProjectTransaction {
  id: string
  project_id: string
  category_id: string
  category: CostCategory
  wbs_id: string | null
  reference_type: string | null
  reference_id: string | null
  amount: number
  transaction_date: string
  description: string | null
  created_at: string
}

export interface ProjectHistoryEntry {
  id: string
  project_id: string
  field_name: string
  old_value: string | null
  new_value: string | null
  old_label: string | null
  new_label: string | null
  changed_by: string | null
  change_reason: string | null
  metadata: Record<string, unknown> | null
  changed_at: string
}

export interface CostBreakdownItem {
  category_id: string
  code: string
  name: string
  planned: number
  actual: number
  count: number
}

export interface CostSummary {
  total_budget: number
  total_actual: number
  remaining: number
  variance_percent: number
  breakdown: CostBreakdownItem[]
}

// ── WBS (Work Breakdown Structure) ──

export interface WbsNode {
  id: string
  project_id: string
  parent_id: string | null
  code: string
  name: string
  level: number
  path: string | null
  sort_order: number
  planned_start: string | null
  planned_end: string | null
  actual_start: string | null
  actual_end: string | null
  weight: number
  progress_percent: number
  status: WbsStatus
  department_id: string | null
  description: string | null
  children: WbsNode[]
  created_at: string
  updated_at: string
}

// ── CBS (Cost Breakdown Structure) ──

export interface CbsItem {
  id: string
  project_id: string
  wbs_id: string
  category_id: string
  category: CostCategory
  planned_amount: number
  currency: string
  notes: string | null
}

// ── BOQ (Bill of Quantities) ──

export interface BoqItem {
  id: string
  project_id: string
  wbs_id: string | null
  wbs: WbsNode | null
  item_code: string
  item_name: string
  unit: string
  quantity: number
  unit_price: number
  total_price: number
  product_id: string | null
  category_id: string | null
  category: CostCategory | null
  issued_qty: number
  notes: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface BoqImportRecord {
  id: string
  project_id: string
  file_name: string
  total_rows: number
  success_rows: number
  error_rows: number
  errors: { row: number; field: string; message: string }[] | null
  imported_by: string | null
  imported_at: string
}

// ── EVM (Earned Value Management) ──

export interface EvmRow {
  wbs_id: string
  wbs_code: string
  wbs_name: string
  progress_percent: number
  planned_value: number
  earned_value: number
  actual_cost: number
  cost_variance: number
  schedule_variance: number
  cpi: number
  spi: number
}

export interface EvmSummary {
  bac: number
  total_pv: number
  total_ev: number
  total_ac: number
  cost_variance: number
  schedule_variance: number
  cpi: number
  spi: number
  eac: number
  etc: number
  status: 'UNDER_BUDGET' | 'OVER_BUDGET'
}

export interface EvmData {
  summary: EvmSummary
  breakdown: EvmRow[]
}

// ── Approval Workflow ──

export type ApprovalRequestStatus = 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'CANCELED'
export type ApprovalStepStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED'

export interface ApprovalConfigStep {
  id: string
  config_id: string
  step_order: number
  approver_role: string | null
  approver_id: string | null
  is_required: boolean
  is_mandatory: boolean
  required_count: number
  delegate_to_id: string | null
  alternative_approver_id: string | null
  timeout_hours: number | null
}

export interface ApprovalConfig {
  id: string
  organization_id: string | null
  entity_type: string
  name: string
  description: string | null
  module_code: string | null
  is_active: boolean
  conditions: Record<string, unknown> | null
  steps: ApprovalConfigStep[]
}

export interface ApprovalStep {
  id: string
  request_id: string
  step_order: number
  approver_id: string
  approver_name: string | null
  role_code: string | null
  delegated_from_id: string | null
  status: ApprovalStepStatus
  comment: string | null
  acted_at: string | null
}

export interface ApprovalRequest {
  id: string
  config_id: string
  entity_type: string
  entity_id: string
  status: ApprovalRequestStatus
  requested_by: string
  request_data: Record<string, unknown>
  current_step: number
  resolved_at: string | null
  steps: ApprovalStep[]
  created_at: string
}

// ── Project Summary (Dashboard) ──

export interface ProjectSummary {
  project: Project
  finance: {
    total_budget: number
    total_actual: number
    variance: number
    variance_percent: number
    transaction_count: number
  }
  wbs: {
    total_nodes: number
    completed_nodes: number
    in_progress_nodes: number
    avg_progress: number
  }
  boq: {
    total_items: number
    total_value: number
    over_issued_count: number
    warning_count: number
  }
  team_size: number
  recent_history: ProjectHistoryEntry[]
}

// ── Settlement ──

export interface SettlementLine {
  id: string
  settlement_id: string
  product_id: string
  product_name: string
  unit: string
  qty_issued: number
  qty_returned: number
  qty_on_site: number
  qty_variance: number
  unit_price: number
  value_variance: number
  notes: string | null
}

export interface ProjectSettlement {
  id: string
  project_id: string
  settlement_date: string
  status: 'DRAFT' | 'FINALIZED'
  total_material_in: number
  total_material_out: number
  on_site_stock_value: number
  variance: number
  variance_percent: number
  notes: string | null
  settled_by: string | null
  lines: SettlementLine[]
  created_at: string
}
