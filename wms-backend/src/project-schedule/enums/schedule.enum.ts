export enum TaskStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ON_HOLD = 'ON_HOLD',
}

/** Loại mối quan hệ giữa các task (hiện tại chỉ hỗ trợ FS) */
export enum LinkType {
  /** Finish-to-Start: Task B chỉ bắt đầu sau khi Task A hoàn thành */
  FS = 'FS',
}

export enum ScheduleApprovalStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  REVIEWED = 'REVIEWED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}
