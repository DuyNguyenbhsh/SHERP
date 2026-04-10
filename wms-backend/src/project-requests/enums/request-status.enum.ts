export enum ProjectRequestStatus {
  /** Bản nháp — người tạo chưa gửi */
  DRAFT = 'DRAFT',
  /** Đã đề xuất — chờ Trưởng bộ phận duyệt */
  SUBMITTED = 'SUBMITTED',
  /** Trưởng BP đã duyệt — chờ Ban điều hành */
  DEPT_APPROVED = 'DEPT_APPROVED',
  /** Ban điều hành đã duyệt — chờ triển khai (tự tạo Project) */
  EXEC_APPROVED = 'EXEC_APPROVED',
  /** Yêu cầu bổ sung — người duyệt yêu cầu bổ sung thông tin */
  PENDING_INFO = 'PENDING_INFO',
  /** Đã từ chối */
  REJECTED = 'REJECTED',
  /** Đã triển khai — project đã được tạo */
  DEPLOYED = 'DEPLOYED',
  /** Đã hủy */
  CANCELED = 'CANCELED',
}

/**
 * Luồng chuyển trạng thái hợp lệ theo sơ đồ:
 * Đề xuất → Trưởng BP Duyệt → Ban điều hành Duyệt → Triển khai
 */
export const REQUEST_STATUS_TRANSITIONS: Record<
  ProjectRequestStatus,
  ProjectRequestStatus[]
> = {
  [ProjectRequestStatus.DRAFT]: [
    ProjectRequestStatus.SUBMITTED,
    ProjectRequestStatus.CANCELED,
  ],
  [ProjectRequestStatus.SUBMITTED]: [
    ProjectRequestStatus.DEPT_APPROVED,
    ProjectRequestStatus.PENDING_INFO,
    ProjectRequestStatus.REJECTED,
  ],
  [ProjectRequestStatus.DEPT_APPROVED]: [
    ProjectRequestStatus.EXEC_APPROVED,
    ProjectRequestStatus.PENDING_INFO,
    ProjectRequestStatus.REJECTED,
  ],
  [ProjectRequestStatus.EXEC_APPROVED]: [ProjectRequestStatus.DEPLOYED],
  [ProjectRequestStatus.PENDING_INFO]: [
    ProjectRequestStatus.SUBMITTED, // Gửi lại sau khi bổ sung
  ],
  [ProjectRequestStatus.REJECTED]: [ProjectRequestStatus.DRAFT], // Cho phép sửa lại
  [ProjectRequestStatus.DEPLOYED]: [],
  [ProjectRequestStatus.CANCELED]: [],
};

/** Step number mapping cho Stepper UI */
export const STATUS_STEP_MAP: Record<ProjectRequestStatus, number> = {
  [ProjectRequestStatus.DRAFT]: 0,
  [ProjectRequestStatus.SUBMITTED]: 1,
  [ProjectRequestStatus.DEPT_APPROVED]: 2,
  [ProjectRequestStatus.EXEC_APPROVED]: 3,
  [ProjectRequestStatus.PENDING_INFO]: -3,
  [ProjectRequestStatus.REJECTED]: -1,
  [ProjectRequestStatus.DEPLOYED]: 4,
  [ProjectRequestStatus.CANCELED]: -2,
};

/** Role cần thiết để approve ở mỗi bước */
export const STEP_REQUIRED_ROLE: Record<string, string> = {
  SUBMITTED: 'DEPT_HEAD', // Trưởng BP duyệt
  DEPT_APPROVED: 'EXEC_BOARD', // Ban ĐH duyệt
};
