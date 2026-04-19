export const ChecklistFrequency = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  SHIFT: 'SHIFT',
} as const
export type ChecklistFrequency = (typeof ChecklistFrequency)[keyof typeof ChecklistFrequency]

export const ChecklistResultType = {
  PASS_FAIL: 'PASS_FAIL',
  VALUE: 'VALUE',
  PHOTO_ONLY: 'PHOTO_ONLY',
  MIXED: 'MIXED',
} as const
export type ChecklistResultType = (typeof ChecklistResultType)[keyof typeof ChecklistResultType]

export const ChecklistInstanceStatus = {
  NEW: 'NEW',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
} as const
export type ChecklistInstanceStatus =
  (typeof ChecklistInstanceStatus)[keyof typeof ChecklistInstanceStatus]

export const ItemResultState = {
  PASS: 'PASS',
  FAIL: 'FAIL',
  NA: 'NA',
} as const
export type ItemResultState = (typeof ItemResultState)[keyof typeof ItemResultState]

export const PhotoCategory = {
  BEFORE_FIX: 'BEFORE_FIX',
  AFTER_FIX: 'AFTER_FIX',
  EVIDENCE: 'EVIDENCE',
} as const
export type PhotoCategory = (typeof PhotoCategory)[keyof typeof PhotoCategory]

export interface ChecklistItemTemplate {
  id: string
  template_id: string
  display_order: number
  content: string
  result_type: ChecklistResultType
  require_photo: boolean
  value_unit: string | null
  created_at: string
}

export interface ChecklistTemplate {
  id: string
  name: string
  description: string | null
  frequency: ChecklistFrequency
  asset_type: string | null
  is_active: boolean
  items: ChecklistItemTemplate[]
  created_at: string
  updated_at: string
}

export interface ChecklistItemResult {
  id: string
  instance_id: string
  item_template_id: string
  result: ItemResultState | null
  value: string | null
  photos: string[]
  photo_category: PhotoCategory | null
  notes: string | null
  checked_at: string
}

export interface ChecklistInstance {
  id: string
  template_id: string
  work_item_id: string | null
  assignee_id: string
  due_date: string | null
  status: ChecklistInstanceStatus
  completed_at: string | null
  template: ChecklistTemplate
  results: ChecklistItemResult[]
  created_at: string
  updated_at: string
}

export interface SubmitItemResultPayload {
  result?: ItemResultState
  value?: string
  photos?: string[]
  photo_category?: PhotoCategory
  notes?: string
}
