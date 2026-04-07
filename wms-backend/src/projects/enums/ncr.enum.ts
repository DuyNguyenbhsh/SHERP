export enum NcrCategory {
  QUALITY = 'QUALITY',
  SCHEDULE = 'SCHEDULE',
  SAFETY = 'SAFETY',
}

export enum NcrSeverity {
  GREEN = 'GREEN',
  YELLOW = 'YELLOW',
  ORANGE = 'ORANGE',
  RED = 'RED',
  CRITICAL = 'CRITICAL',
}

export enum NcrStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  VERIFIED = 'VERIFIED',
  CLOSED = 'CLOSED',
}

export enum NcrRelatedType {
  TASK = 'TASK',
  WORK_ITEM = 'WORK_ITEM',
  SUBCONTRACT = 'SUBCONTRACT',
  PROJECT = 'PROJECT',
  COMPANY = 'COMPANY',
}

export const NCR_STATUS_TRANSITIONS: Record<NcrStatus, NcrStatus[]> = {
  [NcrStatus.OPEN]: [NcrStatus.IN_PROGRESS],
  [NcrStatus.IN_PROGRESS]: [NcrStatus.RESOLVED],
  [NcrStatus.RESOLVED]: [NcrStatus.VERIFIED, NcrStatus.IN_PROGRESS],
  [NcrStatus.VERIFIED]: [NcrStatus.CLOSED],
  [NcrStatus.CLOSED]: [NcrStatus.OPEN],
};
