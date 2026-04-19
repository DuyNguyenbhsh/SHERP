// Pure fn: tính progress + next status cho Office Task.
// BR-OT-01: task có items → auto COMPLETED khi mọi item is_done.
// BR-OT-02: task không có item → chỉ chuyển COMPLETED bằng endpoint explicit (ở service).

import { OfficeTaskStatus } from '../../enums/office-task.enum';

export interface TransitionInput {
  totalItems: number;
  doneItems: number;
  currentStatus: OfficeTaskStatus;
}

export interface TransitionOutput {
  nextStatus: OfficeTaskStatus;
  progressPct: number;
  shouldCompleteNow: boolean;
}

export function computeTransition(input: TransitionInput): TransitionOutput {
  const { totalItems, doneItems, currentStatus } = input;

  if (currentStatus === OfficeTaskStatus.COMPLETED) {
    return {
      nextStatus: currentStatus,
      progressPct: 100,
      shouldCompleteNow: false,
    };
  }

  if (totalItems === 0) {
    // Không có item: tiến độ không tính được từ item — giữ nguyên status hiện tại
    return {
      nextStatus: currentStatus,
      progressPct: 0,
      shouldCompleteNow: false,
    };
  }

  const progressPct = Math.round((doneItems / totalItems) * 100);

  if (doneItems >= totalItems) {
    return {
      nextStatus: OfficeTaskStatus.COMPLETED,
      progressPct: 100,
      shouldCompleteNow: true,
    };
  }

  if (doneItems > 0) {
    return {
      nextStatus: OfficeTaskStatus.IN_PROGRESS,
      progressPct,
      shouldCompleteNow: false,
    };
  }

  return {
    nextStatus: OfficeTaskStatus.NEW,
    progressPct: 0,
    shouldCompleteNow: false,
  };
}
