export type DocumentStatus = 'VALID' | 'EXPIRING_SOON' | 'EXPIRED'
export type NotificationType = 'EXPIRING_30_DAYS' | 'EXPIRING_7_DAYS' | 'EXPIRED'

export interface ProjectFolder {
  id: string
  project_id: string
  folder_code: string
  folder_name: string
  sort_order: number
  documents: ProjectDocument[]
  created_at: string
  updated_at: string
}

export interface ProjectDocument {
  id: string
  folder_id: string
  project_id: string
  document_name: string
  file_url: string | null
  mime_type: string | null
  expiry_date: string | null
  status: DocumentStatus
  notes: string | null
  folder?: ProjectFolder
  created_at: string
  updated_at: string
}

export interface DocumentNotification {
  id: string
  document_id: string
  notification_type: NotificationType
  is_read: boolean
  document: ProjectDocument & { folder: ProjectFolder }
  created_at: string
}
