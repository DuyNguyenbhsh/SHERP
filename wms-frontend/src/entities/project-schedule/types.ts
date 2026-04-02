export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD'
export type LinkType = 'FS'
export type ScheduleApprovalStatus = 'DRAFT' | 'SUBMITTED' | 'REVIEWED' | 'APPROVED' | 'REJECTED'

export interface ProjectTaskItem {
  id: string
  project_id: string
  wbs_id: string | null
  task_code: string
  name: string
  description: string | null
  duration_days: number
  start_date: string | null
  end_date: string | null
  actual_start: string | null
  actual_end: string | null
  progress_percent: number
  status: TaskStatus
  early_start: number | null
  early_finish: number | null
  late_start: number | null
  late_finish: number | null
  total_float: number | null
  is_critical: boolean
  planned_labor: number
  resource_notes: string | null
  sort_order: number
  created_at: string
}

export interface TaskLinkItem {
  id: string
  project_id: string
  predecessor_id: string
  successor_id: string
  link_type: LinkType
  lag_days: number
}

export interface ScheduleData {
  tasks: ProjectTaskItem[]
  links: TaskLinkItem[]
  critical_path_ids: string[]
  resource_timeline: { date: string; labor: number }[]
}

export interface ScheduleBaselineItem {
  id: string
  project_id: string
  version: number
  title: string
  snapshot_data: {
    tasks: Record<string, unknown>[]
    links: Record<string, unknown>[]
    project_end_date: string | null
    critical_path_ids: string[]
    total_duration_days: number
  }
  status: ScheduleApprovalStatus
  frozen_at: string | null
  created_by: string
  created_by_name: string | null
  approved_by: string | null
  approved_by_name: string | null
  created_at: string
}
