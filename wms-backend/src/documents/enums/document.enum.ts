export enum FolderCode {
  SCALE_1_500 = 'SCALE_1_500',
  EIA = 'EIA',
  FIRE_PROTECTION = 'FIRE_PROTECTION',
  CONSTRUCTION_PERMIT = 'CONSTRUCTION_PERMIT',
}

export const DEFAULT_FOLDERS: {
  code: FolderCode;
  name: string;
  sortOrder: number;
}[] = [
  { code: FolderCode.SCALE_1_500, name: '1/500', sortOrder: 1 },
  { code: FolderCode.EIA, name: 'EIA', sortOrder: 2 },
  { code: FolderCode.FIRE_PROTECTION, name: 'Fire Protection', sortOrder: 3 },
  {
    code: FolderCode.CONSTRUCTION_PERMIT,
    name: 'Construction Permit',
    sortOrder: 4,
  },
];

export enum DocumentStatus {
  // Trạng thái expiry (đã có)
  VALID = 'VALID',
  EXPIRING_SOON = 'EXPIRING_SOON',
  EXPIRED = 'EXPIRED',
  // Trạng thái lifecycle (MỚI — Document Control v2.1)
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED',
}

export enum DocumentAuditAction {
  CREATED = 'CREATED',
  UPLOADED_VERSION = 'UPLOADED_VERSION',
  VIEWED = 'VIEWED',
  DOWNLOADED = 'DOWNLOADED',
  SUBMITTED_APPROVAL = 'SUBMITTED_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ROLLBACK = 'ROLLBACK',
  ARCHIVED = 'ARCHIVED',
}

export enum NotificationType {
  EXPIRING_30_DAYS = 'EXPIRING_30_DAYS',
  EXPIRING_7_DAYS = 'EXPIRING_7_DAYS',
  EXPIRED = 'EXPIRED',
}
