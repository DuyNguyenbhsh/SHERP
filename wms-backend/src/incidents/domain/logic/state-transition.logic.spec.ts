import { IncidentStatus } from '../../enums/incident.enum';
import { canTransition } from './state-transition.logic';

describe('canTransition (Incident state machine)', () => {
  it('NEW → ASSIGN → IN_PROGRESS', () => {
    const r = canTransition(IncidentStatus.NEW, 'ASSIGN');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.next).toBe(IncidentStatus.IN_PROGRESS);
  });

  it('IN_PROGRESS → RESOLVE → RESOLVED', () => {
    const r = canTransition(IncidentStatus.IN_PROGRESS, 'RESOLVE');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.next).toBe(IncidentStatus.RESOLVED);
  });

  it('RESOLVED → CLOSE → COMPLETED', () => {
    const r = canTransition(IncidentStatus.RESOLVED, 'CLOSE');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.next).toBe(IncidentStatus.COMPLETED);
  });

  it('COMPLETED → REOPEN → NEW', () => {
    const r = canTransition(IncidentStatus.COMPLETED, 'REOPEN');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.next).toBe(IncidentStatus.NEW);
  });

  it('cấm ASSIGN khi IN_PROGRESS', () => {
    const r = canTransition(IncidentStatus.IN_PROGRESS, 'ASSIGN');
    expect(r.ok).toBe(false);
  });

  it('cấm CLOSE trực tiếp từ NEW', () => {
    const r = canTransition(IncidentStatus.NEW, 'CLOSE');
    expect(r.ok).toBe(false);
  });

  it('cấm RESOLVE khi COMPLETED', () => {
    const r = canTransition(IncidentStatus.COMPLETED, 'RESOLVE');
    expect(r.ok).toBe(false);
  });

  it('cấm REOPEN khi chưa COMPLETED', () => {
    const r = canTransition(IncidentStatus.IN_PROGRESS, 'REOPEN');
    expect(r.ok).toBe(false);
  });
});
