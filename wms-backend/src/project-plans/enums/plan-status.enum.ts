/**
 * Trạng thái kế hoạch thi công theo quy trình PROJ1:
 *   Soạn thảo → Trình duyệt → Xem xét → Phê duyệt (Baseline)
 */
export enum PlanStatus {
  /** Bản nháp — đang soạn, có thể sửa tự do */
  DRAFT = 'DRAFT',
  /** Đã trình — dữ liệu bị khóa, chờ PM/Trưởng BP xem xét */
  SUBMITTED = 'SUBMITTED',
  /** Đang xem xét — PM đã nhận, đang review */
  REVIEWED = 'REVIEWED',
  /** Đã phê duyệt — trở thành Baseline, read-only vĩnh viễn */
  APPROVED = 'APPROVED',
  /** Bị từ chối — tự clone sang version mới để sửa */
  REJECTED = 'REJECTED',
}

export const PLAN_STATUS_TRANSITIONS: Record<PlanStatus, PlanStatus[]> = {
  [PlanStatus.DRAFT]: [PlanStatus.SUBMITTED],
  [PlanStatus.SUBMITTED]: [PlanStatus.REVIEWED, PlanStatus.REJECTED],
  [PlanStatus.REVIEWED]: [PlanStatus.APPROVED, PlanStatus.REJECTED],
  [PlanStatus.APPROVED]: [], // Read-only vĩnh viễn
  [PlanStatus.REJECTED]: [], // Tự clone sang DRAFT mới
};

/** Step index cho Timeline UI */
export const PLAN_STEP_MAP: Record<PlanStatus, number> = {
  [PlanStatus.DRAFT]: 0,
  [PlanStatus.SUBMITTED]: 1,
  [PlanStatus.REVIEWED]: 2,
  [PlanStatus.APPROVED]: 3,
  [PlanStatus.REJECTED]: -1,
};

export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  [PlanStatus.DRAFT]: 'Soạn thảo',
  [PlanStatus.SUBMITTED]: 'Đã trình duyệt',
  [PlanStatus.REVIEWED]: 'Đang xem xét',
  [PlanStatus.APPROVED]: 'Đã phê duyệt',
  [PlanStatus.REJECTED]: 'Từ chối',
};
