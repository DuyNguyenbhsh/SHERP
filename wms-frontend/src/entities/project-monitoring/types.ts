export type ReportStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'
export type VOStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELED'
export type VOType = 'BUDGET' | 'TIMELINE' | 'SCOPE' | 'COMBINED'
export type HealthStatus = 'GREEN' | 'YELLOW' | 'RED'

export interface WbsProgressItem {
  wbs_id: string
  wbs_code: string
  wbs_name: string
  planned_percent: number
  actual_percent: number
  notes?: string
}

export interface ProgressReport {
  id: string
  project_id: string
  report_period: string
  report_date: string
  summary: string | null
  wbs_progress: WbsProgressItem[] | null
  evidence_attachments: string[] | null
  evidence_notes: string | null
  overall_progress: number
  earned_value: number
  actual_cost: number
  planned_value: number
  spi: number
  cpi: number
  status: ReportStatus
  created_by: string
  created_by_name: string | null
  approved_by: string | null
  approved_by_name: string | null
  rejection_reason: string | null
  created_at: string
}

export interface VariationOrder {
  id: string
  project_id: string
  vo_code: string
  title: string
  description: string | null
  vo_type: VOType
  budget_before: number | null
  budget_after: number | null
  budget_delta: number | null
  timeline_before: string | null
  timeline_after: string | null
  scope_description: string | null
  attachments: string[] | null
  reason: string
  status: VOStatus
  created_by: string
  created_by_name: string | null
  approved_by: string | null
  approved_by_name: string | null
  rejection_reason: string | null
  created_at: string
}

export interface ProjectHealth {
  spi: number
  cpi: number
  schedule_variance: number
  cost_variance: number
  eac: number
  etc: number
  vac: number
  health_status: HealthStatus
  health_label: string
  planned_value: number
  earned_value: number
  actual_cost: number
  bac: number
}

export interface SCurvePoint {
  period: string
  date: string
  pv: number
  ev: number
  ac: number
  spi: number
  cpi: number
  progress: number
}
