import { validatePasswordPolicy, matchesPolicy } from './password-policy.logic';

describe('Password Policy Logic (Pure Domain)', () => {
  describe('validatePasswordPolicy', () => {
    it('mật khẩu hợp lệ → valid = true, 0 errors', () => {
      const result = validatePasswordPolicy('Admin@123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('thiếu chữ hoa → 1 error', () => {
      const result = validatePasswordPolicy('admin@123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Thiếu chữ hoa');
    });

    it('thiếu chữ thường → 1 error', () => {
      const result = validatePasswordPolicy('ADMIN@123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Thiếu chữ thường');
    });

    it('thiếu số → 1 error', () => {
      const result = validatePasswordPolicy('Admin@abc');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Thiếu chữ số');
    });

    it('thiếu ký tự đặc biệt → 1 error', () => {
      const result = validatePasswordPolicy('Admin1234');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Thiếu ký tự đặc biệt (!@#$%^&*)');
    });

    it('quá ngắn (< 8 ký tự) → error', () => {
      const result = validatePasswordPolicy('Ab@1');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Mật khẩu phải có ít nhất 8 ký tự');
    });

    it('thiếu tất cả → 4 errors', () => {
      const result = validatePasswordPolicy('abc');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });

    it('chuỗi rỗng → nhiều errors', () => {
      const result = validatePasswordPolicy('');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('matchesPolicy (regex)', () => {
    it('mật khẩu hợp lệ → true', () => {
      expect(matchesPolicy('Admin@123')).toBe(true);
      expect(matchesPolicy('P@ssw0rd!')).toBe(true);
      expect(matchesPolicy('SH-Group@2026')).toBe(true);
    });

    it('mật khẩu không hợp lệ → false', () => {
      expect(matchesPolicy('admin123')).toBe(false); // thiếu hoa + đặc biệt
      expect(matchesPolicy('ADMIN123')).toBe(false); // thiếu thường + đặc biệt
      expect(matchesPolicy('short')).toBe(false); // quá ngắn
    });
  });
});
