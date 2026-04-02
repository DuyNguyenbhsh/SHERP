/**
 * Account Lockout — Pure domain logic.
 * Không phụ thuộc framework, 100% testable.
 */

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export interface LockoutCheckResult {
  locked: boolean;
  remainingMinutes: number;
  failedCount: number;
}

export interface FailedAttemptResult {
  newCount: number;
  shouldLock: boolean;
  lockUntil: Date | null;
}

/** Kiểm tra tài khoản có đang bị khoá */
export function checkLockout(
  failedCount: number,
  lockedUntil: Date | null,
): LockoutCheckResult {
  if (lockedUntil && lockedUntil.getTime() > Date.now()) {
    const remainingMs = lockedUntil.getTime() - Date.now();
    return {
      locked: true,
      remainingMinutes: Math.ceil(remainingMs / 60000),
      failedCount,
    };
  }
  return { locked: false, remainingMinutes: 0, failedCount };
}

/** Tính toán khi login sai: tăng count, quyết định có khoá không */
export function applyFailedAttempt(currentCount: number): FailedAttemptResult {
  const newCount = currentCount + 1;
  if (newCount >= MAX_ATTEMPTS) {
    const lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
    return { newCount, shouldLock: true, lockUntil };
  }
  return { newCount, shouldLock: false, lockUntil: null };
}
