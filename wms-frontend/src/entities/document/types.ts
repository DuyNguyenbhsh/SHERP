// ── Enum mirrors (khớp 100% với wms-backend/src/documents/enums/document.enum.ts) ──

export type DocumentStatus =
  | 'VALID'
  | 'EXPIRING_SOON'
  | 'EXPIRED'
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'ARCHIVED'

export type NotificationType = 'EXPIRING_30_DAYS' | 'EXPIRING_7_DAYS' | 'EXPIRED'

export type DocumentAuditAction =
  | 'CREATED'
  | 'UPLOADED_VERSION'
  | 'VIEWED'
  | 'DOWNLOADED'
  | 'SUBMITTED_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'ROLLBACK'
  | 'ARCHIVED'

export type DocumentAuditEntityType = 'DOCUMENT' | 'DOCUMENT_VERSION'

// ── Entities ──

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
  // Document Control v2.1
  current_version_id: string | null
  approved_version_id: string | null
  doc_type: string | null
  tags: string[] | null
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

export interface DocumentVersion {
  id: string
  document_id: string
  version_number: string
  version_seq: number
  file_url: string
  cloudinary_public_id: string | null
  file_name: string
  file_size: string
  mime_type: string | null
  checksum: string
  change_note: string
  source_version_id: string | null
  uploaded_by: string
  is_archived: boolean
  created_at: string
}

export interface DocumentAuditLog {
  id: string
  entity_type: DocumentAuditEntityType
  entity_id: string
  action: DocumentAuditAction
  actor_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  ip: string | null
  user_agent: string | null
  created_at: string
}

// ── Search & Approval DTOs ──

export interface DocumentSearchParams {
  keyword?: string
  project_id?: string
  status?: DocumentStatus
  doc_type?: string
  tags?: string[]
  from_date?: string
  to_date?: string
  limit?: number
  offset?: number
}

export interface DocumentSearchResult {
  total: number
  items: ProjectDocument[]
  limit: number
  offset: number
}

export interface DocumentApprovalStatus {
  document_status: DocumentStatus
  current_version_id: string | null
  approved_version_id: string | null
  approval_request: {
    id: string
    status: 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'CANCELED'
    current_step: number
    resolved_at: string | null
    created_at: string
  } | null
}
