export type ProjectRequestStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'DEPT_APPROVED'
  | 'EXEC_APPROVED'
  | 'REJECTED'
  | 'DEPLOYED'
  | 'CANCELED'

export interface WorkflowLog {
  id: string
  request_id: string
  from_status: string
  to_status: string
  action: string
  acted_by: string
  acted_by_name: string | null
  actor_role: string | null
  comment: string | null
  acted_at: string
}

export interface ProjectRequest {
  id: string
  request_code: string
  title: string
  description: string | null
  proposed_project_code: string
  proposed_project_name: string
  location: string | null
  gfa_m2: number | null
  budget: number | null
  investor_id: string | null
  manager_id: string | null
  department_id: string | null
  proposed_stage: string
  status: ProjectRequestStatus
  created_by: string
  created_by_name: string | null
  deployed_project_id: string | null
  rejection_reason: string | null
  workflow_logs: WorkflowLog[]
  created_at: string
  updated_at: string
}

export const STATUS_LABELS: Record<ProjectRequestStatus, string> = {
  DRAFT: 'Bản nháp',
  SUBMITTED: 'Đã đề xuất',
  DEPT_APPROVED: 'Trưởng BP duyệt',
  EXEC_APPROVED: 'BĐH duyệt',
  REJECTED: 'Từ chối',
  DEPLOYED: 'Đã triển khai',
  CANCELED: 'Đã hủy',
}

export const WORKFLOW_STEPS = [
  { label: 'Đề xuất', status: 'DRAFT' as const },
  { label: 'Trưởng BP Duyệt', status: 'SUBMITTED' as const },
  { label: 'Ban ĐH Duyệt', status: 'DEPT_APPROVED' as const },
  { label: 'Triển khai', status: 'EXEC_APPROVED' as const },
]

/** Map status → step index (0-based) */
export const STATUS_STEP_MAP: Record<ProjectRequestStatus, number> = {
  DRAFT: 0,
  SUBMITTED: 1,
  DEPT_APPROVED: 2,
  EXEC_APPROVED: 3,
  REJECTED: -1,
  DEPLOYED: 4,
  CANCELED: -2,
}
