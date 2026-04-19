import { ChecklistInstanceStatus } from '../../enums/checklist.enum';
import { computeTransition } from './instance-transition.logic';

describe('computeTransition (BR-CHK-03)', () => {
  it('0/5 item → NEW, progress 0', () => {
    const out = computeTransition({
      totalItems: 5,
      completedItems: 0,
      currentStatus: ChecklistInstanceStatus.NEW,
    });
    expect(out.nextStatus).toBe(ChecklistInstanceStatus.NEW);
    expect(out.progressPct).toBe(0);
    expect(out.shouldCompleteNow).toBe(false);
  });

  it('3/5 item → IN_PROGRESS, progress 60', () => {
    const out = computeTransition({
      totalItems: 5,
      completedItems: 3,
      currentStatus: ChecklistInstanceStatus.NEW,
    });
    expect(out.nextStatus).toBe(ChecklistInstanceStatus.IN_PROGRESS);
    expect(out.progressPct).toBe(60);
    expect(out.shouldCompleteNow).toBe(false);
  });

  it('5/5 item → auto-complete, shouldCompleteNow=true', () => {
    const out = computeTransition({
      totalItems: 5,
      completedItems: 5,
      currentStatus: ChecklistInstanceStatus.IN_PROGRESS,
    });
    expect(out.nextStatus).toBe(ChecklistInstanceStatus.COMPLETED);
    expect(out.progressPct).toBe(100);
    expect(out.shouldCompleteNow).toBe(true);
  });

  it('đã COMPLETED → idempotent, shouldCompleteNow=false', () => {
    const out = computeTransition({
      totalItems: 5,
      completedItems: 5,
      currentStatus: ChecklistInstanceStatus.COMPLETED,
    });
    expect(out.nextStatus).toBe(ChecklistInstanceStatus.COMPLETED);
    expect(out.shouldCompleteNow).toBe(false);
  });
});
