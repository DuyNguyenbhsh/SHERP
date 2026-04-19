export const WorkItemType = {
  CHECKLIST: 'CHECKLIST',
  INCIDENT: 'INCIDENT',
  ENERGY_INSPECTION: 'ENERGY_INSPECTION',
  OFFICE_TASK: 'OFFICE_TASK',
} as const
export type WorkItemType = (typeof WorkItemType)[keyof typeof WorkItemType]

export const WORK_ITEM_TYPE_LABELS: Record<WorkItemType, string> = {
  CHECKLIST: 'Checklist',
  INCIDENT: 'Sự cố',
  ENERGY_INSPECTION: 'Đọc công tơ',
  OFFICE_TASK: 'Việc văn phòng',
}

export const WorkItemStatus = {
  NEW: 'NEW',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
} as const
export type WorkItemStatus = (typeof WorkItemStatus)[keyof typeof WorkItemStatus]

export const WORK_ITEM_STATUS_LABELS: Record<WorkItemStatus, string> = {
  NEW: 'Mới',
  IN_PROGRESS: 'Đang làm',
  COMPLETED: 'Hoàn thành',
}

export interface WorkItem {
  id: string
  work_item_type: WorkItemType
  subject_id: string | null
  project_id: string
  assignee_id: string | null
  task_template_id: string | null
  scheduled_date: string | null
  due_date: string | null
  status: WorkItemStatus
  progress_pct: number
  title: string
  parent_id: string | null
  created_at: string
  updated_at: string
}

export interface WorkItemFeedFilter {
  types?: WorkItemType[]
  statuses?: WorkItemStatus[]
  onlyMine?: boolean
  from?: string
  to?: string
  limit?: number
}
