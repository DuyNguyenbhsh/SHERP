export type PlanStatus = 'DRAFT' | 'SUBMITTED' | 'REVIEWED' | 'APPROVED' | 'REJECTED'

export interface PlanApprovalLog {
  id: string
  plan_id: string
  from_status: string
  to_status: string
  action: string
  acted_by: string
  acted_by_name: string | null
  actor_role: string | null
  comment: string | null
  acted_at: string
}

export interface ProjectPlan {
  id: string
  project_id: string
  version: number
  title: string
  description: string | null
  planned_start: string | null
  planned_end: string | null
  total_budget: number | null
  plan_data: Record<string, unknown> | null
  attachments: string[] | null
  status: PlanStatus
  is_baseline: boolean
  frozen_at: string | null
  created_by: string
  created_by_name: string | null
  submitted_by: string | null
  submitted_by_name: string | null
  reviewed_by: string | null
  reviewed_by_name: string | null
  approved_by: string | null
  approved_by_name: string | null
  rejection_reason: string | null
  previous_version_id: string | null
  approval_logs: PlanApprovalLog[]
  created_at: string
  updated_at: string
}

export interface PlanNotification {
  id: string
  plan_id: string
  project_id: string
  recipient_id: string
  notification_type: string
  title: string
  message: string | null
  is_read: boolean
  created_at: string
}

export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  DRAFT: 'Soạn thảo',
  SUBMITTED: 'Đã trình duyệt',
  REVIEWED: 'Đang xem xét',
  APPROVED: 'Đã phê duyệt',
  REJECTED: 'Từ chối',
}

export const PLAN_WORKFLOW_STEPS = [
  { label: 'Soạn thảo', description: 'Lập kế hoạch' },
  { label: 'Trình duyệt', description: 'Chờ PM xem xét' },
  { label: 'Xem xét', description: 'PM đánh giá' },
  { label: 'Phê duyệt', description: 'Baseline chính thức' },
]

export const PLAN_STEP_MAP: Record<PlanStatus, number> = {
  DRAFT: 0,
  SUBMITTED: 1,
  REVIEWED: 2,
  APPROVED: 3,
  REJECTED: -1,
}
