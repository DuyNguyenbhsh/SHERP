import { ProjectStatus } from './project.enum';
import { isValidTransition, STATUS_TRANSITIONS } from './status-flow';

describe('STATUS_TRANSITIONS', () => {
  it('should cover every ProjectStatus key', () => {
    const allStatuses = Object.values(ProjectStatus);
    const mappedStatuses = Object.keys(STATUS_TRANSITIONS);
    expect(mappedStatuses.sort()).toEqual(allStatuses.sort());
  });

  it('should have arrays (no undefined targets) for every status', () => {
    for (const status of Object.values(ProjectStatus)) {
      expect(Array.isArray(STATUS_TRANSITIONS[status])).toBe(true);
    }
  });
});

describe('isValidTransition()', () => {
  // -------------------------------------------------------
  // 1. All valid transitions — every entry in the map
  // -------------------------------------------------------
  describe('valid transitions (every entry in STATUS_TRANSITIONS)', () => {
    const cases: [ProjectStatus, ProjectStatus][] = [];
    for (const [from, targets] of Object.entries(STATUS_TRANSITIONS)) {
      for (const to of targets) {
        cases.push([from as ProjectStatus, to]);
      }
    }

    it.each(cases)('%s -> %s should be valid', (from, to) => {
      expect(isValidTransition(from, to)).toBe(true);
    });
  });

  // -------------------------------------------------------
  // 2. Invalid transitions
  // -------------------------------------------------------
  describe('invalid transitions', () => {
    const invalidCases: [ProjectStatus, ProjectStatus][] = [
      [ProjectStatus.ACTIVE, ProjectStatus.DRAFT],
      [ProjectStatus.ACTIVE, ProjectStatus.BIDDING],
      [ProjectStatus.SETTLED, ProjectStatus.DRAFT],
      [ProjectStatus.WARRANTY, ProjectStatus.ACTIVE],
      [ProjectStatus.WON_BID, ProjectStatus.BIDDING],
      [ProjectStatus.BIDDING, ProjectStatus.ACTIVE],
      [ProjectStatus.ON_HOLD, ProjectStatus.SETTLED],
      [ProjectStatus.SETTLING, ProjectStatus.WARRANTY],
    ];

    it.each(invalidCases)('%s -> %s should be invalid', (from, to) => {
      expect(isValidTransition(from, to)).toBe(false);
    });
  });

  // -------------------------------------------------------
  // 3. Same-status transition (from === to) returns true
  // -------------------------------------------------------
  describe('same-status transition', () => {
    it.each(Object.values(ProjectStatus))(
      '%s -> %s (same) should return true',
      (status) => {
        expect(isValidTransition(status, status)).toBe(true);
      },
    );
  });

  // -------------------------------------------------------
  // 4. Terminal states have no outgoing transitions
  // -------------------------------------------------------
  describe('terminal states have no outgoing transitions', () => {
    const terminalStatuses = [
      ProjectStatus.LOST_BID,
      ProjectStatus.RETENTION_RELEASED,
      ProjectStatus.CANCELED,
    ];

    it.each(terminalStatuses)(
      '%s should have an empty transition list',
      (status) => {
        expect(STATUS_TRANSITIONS[status]).toEqual([]);
      },
    );

    // Terminal states cannot go to any other status
    it.each(terminalStatuses)(
      '%s -> any other status should be invalid',
      (terminal) => {
        for (const target of Object.values(ProjectStatus)) {
          if (target === terminal) continue; // same-status is allowed
          expect(isValidTransition(terminal, target)).toBe(false);
        }
      },
    );
  });

  // -------------------------------------------------------
  // 5. DRAFT can go to BIDDING, ACTIVE, or CANCELED
  // -------------------------------------------------------
  describe('DRAFT outgoing transitions', () => {
    it('should allow exactly BIDDING, ACTIVE, CANCELED', () => {
      expect(STATUS_TRANSITIONS[ProjectStatus.DRAFT].sort()).toEqual(
        [
          ProjectStatus.BIDDING,
          ProjectStatus.ACTIVE,
          ProjectStatus.CANCELED,
        ].sort(),
      );
    });

    it('DRAFT -> BIDDING is valid', () => {
      expect(
        isValidTransition(ProjectStatus.DRAFT, ProjectStatus.BIDDING),
      ).toBe(true);
    });

    it('DRAFT -> ACTIVE is valid', () => {
      expect(isValidTransition(ProjectStatus.DRAFT, ProjectStatus.ACTIVE)).toBe(
        true,
      );
    });

    it('DRAFT -> CANCELED is valid', () => {
      expect(
        isValidTransition(ProjectStatus.DRAFT, ProjectStatus.CANCELED),
      ).toBe(true);
    });
  });

  // -------------------------------------------------------
  // 6. Full bidding flow end-to-end
  //    DRAFT -> BIDDING -> WON_BID -> ACTIVE -> SETTLING
  //    -> SETTLED -> WARRANTY -> RETENTION_RELEASED
  // -------------------------------------------------------
  describe('full bidding flow (end-to-end)', () => {
    const flow: ProjectStatus[] = [
      ProjectStatus.DRAFT,
      ProjectStatus.BIDDING,
      ProjectStatus.WON_BID,
      ProjectStatus.ACTIVE,
      ProjectStatus.SETTLING,
      ProjectStatus.SETTLED,
      ProjectStatus.WARRANTY,
      ProjectStatus.RETENTION_RELEASED,
    ];

    it('every consecutive pair in the flow should be a valid transition', () => {
      for (let i = 0; i < flow.length - 1; i++) {
        const from = flow[i];
        const to = flow[i + 1];
        expect(isValidTransition(from, to)).toBe(true);
      }
    });

    it('reverse direction should be invalid (except bidirectional pairs)', () => {
      // SETTLING <-> ACTIVE is bidirectional, so skip that pair for reverse check
      for (let i = 0; i < flow.length - 1; i++) {
        const from = flow[i];
        const to = flow[i + 1];
        const isBidirectional = STATUS_TRANSITIONS[to]?.includes(from) ?? false;
        if (!isBidirectional) {
          expect(isValidTransition(to, from)).toBe(false);
        }
      }
    });
  });
});
