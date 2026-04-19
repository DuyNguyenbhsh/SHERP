export const OfficeTaskStatus = {
  NEW: 'NEW',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
} as const
export type OfficeTaskStatus = (typeof OfficeTaskStatus)[keyof typeof OfficeTaskStatus]

export interface OfficeTaskItem {
  id: string
  task_id: string
  display_order: number
  content: string
  is_done: boolean
  completed_by: string | null
  completed_at: string | null
  created_at: string
}

export interface OfficeTask {
  id: string
  title: string
  description: string | null
  project_id: string
  work_item_id: string | null
  assignee_id: string
  due_date: string | null
  status: OfficeTaskStatus
  attachments: string[]
  completed_at: string | null
  items: OfficeTaskItem[]
  created_at: string
  updated_at: string
}

export interface CreateOfficeTaskPayload {
  title: string
  description?: string
  project_id: string
  work_item_id?: string
  assignee_id: string
  due_date?: string
  items?: Array<{ display_order: number; content: string }>
  attachments?: string[]
}
