import { OfficeTaskStatus } from '../../enums/office-task.enum';
import { computeTransition } from './office-task-transition.logic';

describe('computeTransition (Office Task BR-OT-01/02)', () => {
  it('không có item, NEW → giữ NEW, progress 0', () => {
    const r = computeTransition({
      totalItems: 0,
      doneItems: 0,
      currentStatus: OfficeTaskStatus.NEW,
    });
    expect(r.nextStatus).toBe(OfficeTaskStatus.NEW);
    expect(r.shouldCompleteNow).toBe(false);
  });

  it('2/4 item done → IN_PROGRESS, progress 50', () => {
    const r = computeTransition({
      totalItems: 4,
      doneItems: 2,
      currentStatus: OfficeTaskStatus.NEW,
    });
    expect(r.nextStatus).toBe(OfficeTaskStatus.IN_PROGRESS);
    expect(r.progressPct).toBe(50);
  });

  it('4/4 item → BR-OT-01 auto COMPLETED', () => {
    const r = computeTransition({
      totalItems: 4,
      doneItems: 4,
      currentStatus: OfficeTaskStatus.IN_PROGRESS,
    });
    expect(r.nextStatus).toBe(OfficeTaskStatus.COMPLETED);
    expect(r.shouldCompleteNow).toBe(true);
  });

  it('đã COMPLETED → idempotent', () => {
    const r = computeTransition({
      totalItems: 4,
      doneItems: 4,
      currentStatus: OfficeTaskStatus.COMPLETED,
    });
    expect(r.shouldCompleteNow).toBe(false);
  });
});
