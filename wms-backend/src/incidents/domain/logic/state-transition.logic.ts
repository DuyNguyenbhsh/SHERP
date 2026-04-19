// Pure fn: validate Incident state transition theo SA_DESIGN §state-machine.
// NEW → IN_PROGRESS (assign)
// IN_PROGRESS → RESOLVED (resolve with AFTER_FIX photos)
// RESOLVED → COMPLETED (close by QLDA)
// COMPLETED → NEW (via approved reopen request)

import { IncidentStatus } from '../../enums/incident.enum';

export type IncidentAction = 'ASSIGN' | 'RESOLVE' | 'CLOSE' | 'REOPEN';

const TRANSITIONS: Record<
  IncidentAction,
  { from: IncidentStatus[]; to: IncidentStatus }
> = {
  ASSIGN: { from: [IncidentStatus.NEW], to: IncidentStatus.IN_PROGRESS },
  RESOLVE: { from: [IncidentStatus.IN_PROGRESS], to: IncidentStatus.RESOLVED },
  CLOSE: { from: [IncidentStatus.RESOLVED], to: IncidentStatus.COMPLETED },
  REOPEN: { from: [IncidentStatus.COMPLETED], to: IncidentStatus.NEW },
};

export function canTransition(
  current: IncidentStatus,
  action: IncidentAction,
): { ok: true; next: IncidentStatus } | { ok: false; reason: string } {
  const t = TRANSITIONS[action];
  if (!t.from.includes(current)) {
    return {
      ok: false,
      reason: `Không thể ${action} khi trạng thái ${current} (yêu cầu: ${t.from.join('/')})`,
    };
  }
  return { ok: true, next: t.to };
}
