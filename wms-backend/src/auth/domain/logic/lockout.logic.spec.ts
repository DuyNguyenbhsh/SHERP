import { checkLockout, applyFailedAttempt } from './lockout.logic';

describe('Lockout Logic (Pure Domain)', () => {
  // ── checkLockout ──
  describe('checkLockout', () => {
    it('tài khoản không bị khoá → locked = false', () => {
      const result = checkLockout(0, null);
      expect(result.locked).toBe(false);
      expect(result.remainingMinutes).toBe(0);
    });

    it('locked_until trong quá khứ → hết khoá', () => {
      const pastDate = new Date(Date.now() - 60000);
      const result = checkLockout(5, pastDate);
      expect(result.locked).toBe(false);
    });

    it('locked_until trong tương lai → đang bị khoá', () => {
      const futureDate = new Date(Date.now() + 10 * 60000); // 10 phút nữa
      const result = checkLockout(5, futureDate);
      expect(result.locked).toBe(true);
      expect(result.remainingMinutes).toBeGreaterThanOrEqual(9);
      expect(result.remainingMinutes).toBeLessThanOrEqual(10);
    });
  });

  // ── applyFailedAttempt ──
  describe('applyFailedAttempt', () => {
    it('lần sai thứ 1 → count=1, không khoá', () => {
      const result = applyFailedAttempt(0);
      expect(result.newCount).toBe(1);
      expect(result.shouldLock).toBe(false);
      expect(result.lockUntil).toBeNull();
    });

    it('lần sai thứ 4 → count=4, chưa khoá', () => {
      const result = applyFailedAttempt(3);
      expect(result.newCount).toBe(4);
      expect(result.shouldLock).toBe(false);
    });

    it('lần sai thứ 5 → count=5, KHOÁ 15 phút', () => {
      const result = applyFailedAttempt(4);
      expect(result.newCount).toBe(5);
      expect(result.shouldLock).toBe(true);
      expect(result.lockUntil).not.toBeNull();

      const expectedLock = Date.now() + 15 * 60 * 1000;
      expect(result.lockUntil!.getTime()).toBeGreaterThan(expectedLock - 2000);
      expect(result.lockUntil!.getTime()).toBeLessThan(expectedLock + 2000);
    });

    it('lần sai thứ 10 → vẫn khoá (edge case)', () => {
      const result = applyFailedAttempt(9);
      expect(result.newCount).toBe(10);
      expect(result.shouldLock).toBe(true);
    });
  });
});
