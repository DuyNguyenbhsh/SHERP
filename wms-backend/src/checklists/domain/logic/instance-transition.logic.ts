// Pure fn: tính progress_pct + next status từ tổng số item và số item đã có result.
// BR-CHK-03: 100% item đã có result → COMPLETED tự động.

import { ChecklistInstanceStatus } from '../../enums/checklist.enum';

export interface TransitionInput {
  totalItems: number;
  completedItems: number;
  currentStatus: ChecklistInstanceStatus;
}

export interface TransitionOutput {
  nextStatus: ChecklistInstanceStatus;
  progressPct: number;
  shouldCompleteNow: boolean;
}

export function computeTransition(input: TransitionInput): TransitionOutput {
  const { totalItems, completedItems, currentStatus } = input;
  const progressPct =
    totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);

  if (currentStatus === ChecklistInstanceStatus.COMPLETED) {
    return {
      nextStatus: currentStatus,
      progressPct: 100,
      shouldCompleteNow: false,
    };
  }

  if (totalItems > 0 && completedItems >= totalItems) {
    return {
      nextStatus: ChecklistInstanceStatus.COMPLETED,
      progressPct: 100,
      shouldCompleteNow: true,
    };
  }

  if (completedItems > 0) {
    return {
      nextStatus: ChecklistInstanceStatus.IN_PROGRESS,
      progressPct,
      shouldCompleteNow: false,
    };
  }

  return {
    nextStatus: ChecklistInstanceStatus.NEW,
    progressPct: 0,
    shouldCompleteNow: false,
  };
}
