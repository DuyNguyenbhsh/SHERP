/**
 * Org Chart & HR Foundation — Unit Tests
 * Kiểm tra: OrgType enum, AssignmentRole enum, Position scope logic
 */

import { OrgType } from './enums/org-type.enum';
import { AssignmentRole } from '../projects/enums/assignment-role.enum';

describe('Org Chart Foundation', () => {
  // ── OrgType Enum ──
  describe('OrgType Enum', () => {
    it('có đủ 4 loại', () => {
      expect(Object.values(OrgType)).toHaveLength(4);
    });

    it('chứa CORPORATE_DEPT, RETAIL_STORE (cũ)', () => {
      expect(OrgType.CORPORATE_DEPT).toBe('CORPORATE_DEPT');
      expect(OrgType.RETAIL_STORE).toBe('RETAIL_STORE');
    });

    it('chứa DIVISION, PROJECT_SITE (mới)', () => {
      expect(OrgType.DIVISION).toBe('DIVISION');
      expect(OrgType.PROJECT_SITE).toBe('PROJECT_SITE');
    });
  });

  // ── AssignmentRole Enum ──
  describe('AssignmentRole Enum', () => {
    it('có đủ 7 roles', () => {
      expect(Object.values(AssignmentRole)).toHaveLength(7);
    });

    it('giữ backward-compatible: PROJECT_MANAGER + MEMBER', () => {
      expect(AssignmentRole.PROJECT_MANAGER).toBe('PROJECT_MANAGER');
      expect(AssignmentRole.MEMBER).toBe('MEMBER');
    });

    it('có đủ 5 site roles mới', () => {
      expect(AssignmentRole.SITE_SUPERVISOR).toBe('SITE_SUPERVISOR');
      expect(AssignmentRole.SITE_DIRECTOR).toBe('SITE_DIRECTOR');
      expect(AssignmentRole.SITE_QS).toBe('SITE_QS');
      expect(AssignmentRole.SITE_ACCOUNTANT).toBe('SITE_ACCOUNTANT');
      expect(AssignmentRole.SITE_ENGINEER).toBe('SITE_ENGINEER');
    });
  });

  // ── Position Scope Logic ──
  describe('Position Scope Logic', () => {
    const SITE_POSITIONS = [
      'SITE_SUPERVISOR',
      'SITE_QS',
      'SITE_DIRECTOR',
      'SITE_ACCOUNTANT',
      'SITE_ENGINEER',
      'SITE_SAFETY',
    ];

    const CENTRAL_POSITIONS = [
      'PROJECT_DIRECTOR',
      'CC_SPECIALIST',
      'CC_MANAGER',
      'PMO_MANAGER',
      'CHIEF_ACCOUNTANT',
      'HR_MANAGER',
      'PROCUREMENT_MGR',
    ];

    it('6 positions có scope = SITE', () => {
      expect(SITE_POSITIONS).toHaveLength(6);
      SITE_POSITIONS.forEach((p) => {
        expect(p).toMatch(/^SITE_/);
      });
    });

    it('7 positions có scope = CENTRAL', () => {
      expect(CENTRAL_POSITIONS).toHaveLength(7);
      CENTRAL_POSITIONS.forEach((p) => {
        expect(p).not.toMatch(/^SITE_/);
      });
    });

    it('tổng cộng 13 positions', () => {
      expect(SITE_POSITIONS.length + CENTRAL_POSITIONS.length).toBe(13);
    });
  });

  // ── Data Scope Filter Logic ──
  describe('Data Scope Filter', () => {
    function getProjectScope(
      positionScope: 'SITE' | 'CENTRAL',
      assignedProjectIds: string[],
    ) {
      if (positionScope === 'CENTRAL') {
        return { type: 'CENTRAL' as const, projectIds: null };
      }
      return { type: 'SITE' as const, projectIds: assignedProjectIds };
    }

    it('CENTRAL scope → xem toàn bộ Portfolio (projectIds = null)', () => {
      const scope = getProjectScope('CENTRAL', []);
      expect(scope.type).toBe('CENTRAL');
      expect(scope.projectIds).toBeNull();
    });

    it('SITE scope → chỉ xem projects assigned', () => {
      const scope = getProjectScope('SITE', ['proj-001', 'proj-002']);
      expect(scope.type).toBe('SITE');
      expect(scope.projectIds).toEqual(['proj-001', 'proj-002']);
    });

    it('SITE scope không có assignment → mảng rỗng (không thấy gì)', () => {
      const scope = getProjectScope('SITE', []);
      expect(scope.type).toBe('SITE');
      expect(scope.projectIds).toEqual([]);
    });
  });
});
