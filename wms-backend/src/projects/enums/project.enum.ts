export enum ProjectStage {
  PLANNING = 'PLANNING',
  PERMITTING = 'PERMITTING',
  CONSTRUCTION = 'CONSTRUCTION',
  MANAGEMENT = 'MANAGEMENT',
}

export enum ProjectStatus {
  DRAFT = 'DRAFT',
  BIDDING = 'BIDDING',
  WON_BID = 'WON_BID',
  LOST_BID = 'LOST_BID',
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  SETTLING = 'SETTLING',
  SETTLED = 'SETTLED',
  WARRANTY = 'WARRANTY',
  RETENTION_RELEASED = 'RETENTION_RELEASED',
  CANCELED = 'CANCELED',
}

export enum ProjectType {
  CONSTRUCTION = 'CONSTRUCTION',
  DESIGN_BUILD = 'DESIGN_BUILD',
  MEP = 'MEP',
  EPC = 'EPC',
}

/**
 * Dự án "đang sống" — whitelist mặc định cho GET /projects/lookup (BR-MPL-01).
 * Dùng làm default status_whitelist khi client không truyền param.
 */
export const PROJECT_ACTIVE_STATUSES: readonly ProjectStatus[] = [
  ProjectStatus.WON_BID,
  ProjectStatus.ACTIVE,
  ProjectStatus.ON_HOLD,
  ProjectStatus.SETTLING,
  ProjectStatus.WARRANTY,
] as const;
