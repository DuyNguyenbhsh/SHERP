import { deriveActualStatus } from './annual-grid.service';
import { WorkItem } from '../work-items/entities/work-item.entity';
import {
  WorkItemStatus,
  WorkItemType,
} from '../work-items/enums/work-item.enum';

function mkItem(
  status: WorkItemStatus,
  dueOffsetMs: number | null,
  updatedAtOffsetMs: number = 0,
  now: Date = new Date('2026-06-15T00:00:00Z'),
): WorkItem {
  const wi = new WorkItem();
  wi.id = 'wi-' + Math.random().toString(36).slice(2);
  wi.work_item_type = WorkItemType.CHECKLIST;
  wi.status = status;
  wi.due_date =
    dueOffsetMs === null ? null : new Date(now.getTime() + dueOffsetMs);
  wi.updated_at = new Date(now.getTime() + updatedAtOffsetMs);
  wi.scheduled_at = new Date(now.getTime() - 24 * 3600 * 1000);
  wi.subject_id = null;
  wi.project_id = 'p1';
  wi.assignee_id = null;
  wi.task_template_id = 't1';
  wi.progress_pct = 0;
  wi.title = 'x';
  wi.parent_id = null;
  wi.parent = null;
  wi.created_at = new Date(now.getTime() - 48 * 3600 * 1000);
  return wi;
}

describe('deriveActualStatus', () => {
  const now = new Date('2026-06-15T00:00:00Z');

  it('không có item → NONE', () => {
    expect(deriveActualStatus([], now)).toBe('NONE');
  });

  it('COMPLETED trước due → ON_TIME', () => {
    const it = mkItem(
      WorkItemStatus.COMPLETED,
      24 * 3600 * 1000, // due 1 ngày sau now
      -1 * 3600 * 1000, // updated 1h trước now
      now,
    );
    expect(deriveActualStatus([it], now)).toBe('ON_TIME');
  });

  it('COMPLETED sau due → LATE', () => {
    const it = mkItem(
      WorkItemStatus.COMPLETED,
      -24 * 3600 * 1000, // due 1 ngày trước now
      1 * 3600 * 1000, // updated 1h sau now (trễ hơn due)
      now,
    );
    expect(deriveActualStatus([it], now)).toBe('LATE');
  });

  it('NEW + due đã qua → MISSED', () => {
    const it = mkItem(WorkItemStatus.NEW, -24 * 3600 * 1000, 0, now);
    expect(deriveActualStatus([it], now)).toBe('MISSED');
  });

  it('NEW + due tương lai → UPCOMING', () => {
    const it = mkItem(WorkItemStatus.NEW, 24 * 3600 * 1000, 0, now);
    expect(deriveActualStatus([it], now)).toBe('UPCOMING');
  });

  it('Mix COMPLETED on-time + NEW missed → LATE không xảy ra, MISSED win', () => {
    const a = mkItem(
      WorkItemStatus.COMPLETED,
      24 * 3600 * 1000,
      -1 * 3600 * 1000,
      now,
    );
    const b = mkItem(WorkItemStatus.NEW, -24 * 3600 * 1000, 0, now);
    // Priority: LATE > MISSED > ON_TIME > UPCOMING → MISSED wins
    expect(deriveActualStatus([a, b], now)).toBe('MISSED');
  });

  it('LATE priority cao nhất khi có cả LATE + MISSED', () => {
    const late = mkItem(
      WorkItemStatus.COMPLETED,
      -24 * 3600 * 1000,
      1 * 3600 * 1000,
      now,
    );
    const missed = mkItem(WorkItemStatus.NEW, -24 * 3600 * 1000, 0, now);
    expect(deriveActualStatus([late, missed], now)).toBe('LATE');
  });
});
