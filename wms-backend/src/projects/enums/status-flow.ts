import { ProjectStatus } from './project.enum';

/**
 * Luong chuyen doi trang thai hop le — mo rong theo ERP Central.
 *
 * DRAFT → BIDDING, ACTIVE, CANCELED
 * BIDDING → WON_BID, LOST_BID, CANCELED
 * WON_BID → ACTIVE, CANCELED
 * LOST_BID → (terminal)
 * ACTIVE → ON_HOLD, SETTLING, CANCELED
 * ON_HOLD → ACTIVE, CANCELED
 * SETTLING → SETTLED, ACTIVE
 * SETTLED → WARRANTY
 * WARRANTY → RETENTION_RELEASED
 * RETENTION_RELEASED → (terminal — dong du an)
 * CANCELED → (terminal)
 */
export const STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  [ProjectStatus.DRAFT]: [
    ProjectStatus.BIDDING,
    ProjectStatus.ACTIVE,
    ProjectStatus.CANCELED,
  ],
  [ProjectStatus.BIDDING]: [
    ProjectStatus.WON_BID,
    ProjectStatus.LOST_BID,
    ProjectStatus.CANCELED,
  ],
  [ProjectStatus.WON_BID]: [ProjectStatus.ACTIVE, ProjectStatus.CANCELED],
  [ProjectStatus.LOST_BID]: [],
  [ProjectStatus.ACTIVE]: [
    ProjectStatus.ON_HOLD,
    ProjectStatus.SETTLING,
    ProjectStatus.CANCELED,
  ],
  [ProjectStatus.ON_HOLD]: [ProjectStatus.ACTIVE, ProjectStatus.CANCELED],
  [ProjectStatus.SETTLING]: [ProjectStatus.SETTLED, ProjectStatus.ACTIVE],
  [ProjectStatus.SETTLED]: [ProjectStatus.WARRANTY],
  [ProjectStatus.WARRANTY]: [ProjectStatus.RETENTION_RELEASED],
  [ProjectStatus.RETENTION_RELEASED]: [],
  [ProjectStatus.CANCELED]: [],
};

export function isValidTransition(
  from: ProjectStatus,
  to: ProjectStatus,
): boolean {
  if (from === to) return true;
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
