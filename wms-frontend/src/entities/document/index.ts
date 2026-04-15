export { useFolders } from './api/useFolders'
export { useCreateDocument, useUpdateDocument, useDeleteDocument } from './api/useDocumentMutations'
export {
  useDocumentNotifications,
  useGenerateNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from './api/useDocumentNotifications'

// Document Control v2.1
export {
  useDocumentVersions,
  useDocumentVersion,
  useUploadVersion,
  useRollbackVersion,
  useArchiveVersion,
} from './api/useDocumentVersions'
export { useDocumentApprovalStatus, useSubmitDocumentApproval } from './api/useDocumentApproval'
export { useDocumentAuditLogs } from './api/useDocumentAudit'
export { useDocumentSearch } from './api/useDocumentSearch'

// Types
export type {
  ProjectFolder,
  ProjectDocument,
  DocumentNotification,
  DocumentStatus,
  NotificationType,
  DocumentVersion,
  DocumentAuditLog,
  DocumentAuditAction,
  DocumentAuditEntityType,
  DocumentSearchParams,
  DocumentSearchResult,
  DocumentApprovalStatus,
} from './types'
export type { CreateDocumentPayload, UpdateDocumentPayload } from './api/useDocumentMutations'
export type {
  UploadVersionPayload,
  RollbackVersionPayload,
  ArchiveVersionPayload,
} from './api/useDocumentVersions'
export type { SubmitApprovalPayload } from './api/useDocumentApproval'
