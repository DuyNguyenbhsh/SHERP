export const IncidentStatus = {
  NEW: 'NEW',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  COMPLETED: 'COMPLETED',
} as const
export type IncidentStatus = (typeof IncidentStatus)[keyof typeof IncidentStatus]

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  NEW: 'Mới báo',
  IN_PROGRESS: 'Đang xử lý',
  RESOLVED: 'Đã khắc phục',
  COMPLETED: 'Đã đóng',
}

export const IncidentSeverity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const
export type IncidentSeverity = (typeof IncidentSeverity)[keyof typeof IncidentSeverity]

export const INCIDENT_SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  LOW: 'Thấp',
  MEDIUM: 'Trung bình',
  HIGH: 'Cao',
  CRITICAL: 'Nghiêm trọng',
}

export const IncidentCategory = {
  ELECTRICAL: 'ELECTRICAL',
  PLUMBING: 'PLUMBING',
  HVAC: 'HVAC',
  SECURITY: 'SECURITY',
  OTHER: 'OTHER',
} as const
export type IncidentCategory = (typeof IncidentCategory)[keyof typeof IncidentCategory]

export const INCIDENT_CATEGORY_LABELS: Record<IncidentCategory, string> = {
  ELECTRICAL: 'Điện',
  PLUMBING: 'Cấp/thoát nước',
  HVAC: 'Điều hoà/thông gió',
  SECURITY: 'An ninh',
  OTHER: 'Khác',
}

export interface IncidentPhoto {
  id: string
  incident_id: string
  secure_url: string
  category: 'BEFORE_FIX' | 'AFTER_FIX' | 'EVIDENCE'
  uploaded_by: string
  uploaded_at: string
}

export interface IncidentComment {
  id: string
  incident_id: string
  actor_id: string
  body: string
  created_at: string
}

export interface Incident {
  id: string
  incident_code: string
  title: string
  description: string
  project_id: string
  work_item_id: string | null
  severity: IncidentSeverity
  category: IncidentCategory
  location_text: string | null
  related_asset: string | null
  reported_by: string
  assigned_to: string | null
  status: IncidentStatus
  due_date: string | null
  assigned_at: string | null
  resolved_at: string | null
  closed_at: string | null
  photos: IncidentPhoto[]
  comments: IncidentComment[]
  created_at: string
  updated_at: string
}

export interface CreateIncidentPayload {
  title: string
  description: string
  project_id: string
  work_item_id?: string
  severity: IncidentSeverity
  category: IncidentCategory
  location_text?: string
  related_asset?: string
  photos: string[]
}

export interface AssignIncidentPayload {
  assigned_to: string
  due_date?: string
  sla_hours?: number
}

export interface ResolveIncidentPayload {
  photos: string[]
  resolution_note?: string
}
