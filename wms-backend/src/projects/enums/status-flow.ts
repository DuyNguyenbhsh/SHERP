import { ProjectStatus } from './project.enum';

/**
 * Luồng chuyển đổi trạng thái hợp lệ.
 * Key = trạng thái hiện tại, Value = danh sách trạng thái được phép chuyển sang.
 *
 * DRAFT → ACTIVE, CANCELED
 * ACTIVE → ON_HOLD, COMPLETED, CANCELED
 * ON_HOLD → ACTIVE, CANCELED
 * COMPLETED → (không chuyển được)
 * CANCELED → (không chuyển được)
 */
export const STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  [ProjectStatus.DRAFT]: [ProjectStatus.ACTIVE, ProjectStatus.CANCELED],
  [ProjectStatus.ACTIVE]: [
    ProjectStatus.ON_HOLD,
    ProjectStatus.COMPLETED,
    ProjectStatus.CANCELED,
  ],
  [ProjectStatus.ON_HOLD]: [ProjectStatus.ACTIVE, ProjectStatus.CANCELED],
  [ProjectStatus.COMPLETED]: [],
  [ProjectStatus.CANCELED]: [],
};

export function isValidTransition(
  from: ProjectStatus,
  to: ProjectStatus,
): boolean {
  if (from === to) return true; // Không đổi = hợp lệ
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
