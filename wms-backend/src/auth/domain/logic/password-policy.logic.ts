/**
 * Password Policy — Pure domain logic.
 * Validate mật khẩu theo chuẩn bảo mật SH-GROUP.
 */

export interface PasswordPolicyResult {
  valid: boolean;
  errors: string[];
}

const POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;

export function validatePasswordPolicy(password: string): PasswordPolicyResult {
  const errors: string[] = [];

  if (password.length < 8) errors.push('Mật khẩu phải có ít nhất 8 ký tự');
  if (!/[a-z]/.test(password)) errors.push('Thiếu chữ thường');
  if (!/[A-Z]/.test(password)) errors.push('Thiếu chữ hoa');
  if (!/\d/.test(password)) errors.push('Thiếu chữ số');
  if (!/[!@#$%^&*]/.test(password))
    errors.push('Thiếu ký tự đặc biệt (!@#$%^&*)');

  return { valid: errors.length === 0, errors };
}

export function matchesPolicy(password: string): boolean {
  return POLICY_REGEX.test(password);
}
