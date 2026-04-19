import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { AuthService } from './auth.service';
import { TokenBlocklistService } from './token-blocklist.service';
import { AuthLogService } from './auth-log.service';
import { MailService } from './mail.service';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user-role.entity';
import { RolePrivilege } from '../users/entities/role-privilege.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { Employee } from '../users/entities/employee.entity';
import { ProjectAssignment } from '../projects/entities/project-assignment.entity';

// ── Mock Repositories ──
const mockUserRepo = {
  findOne: jest.fn(),
  update: jest.fn(),
};
const mockUserRoleRepo = { find: jest.fn() };
const mockRolePrivilegeRepo = { find: jest.fn() };
const mockRefreshRepo = { save: jest.fn(), find: jest.fn(), update: jest.fn() };
const mockResetTokenRepo = {
  save: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
};
const mockEmployeeRepo = { findOne: jest.fn() };
const mockAssignmentRepo = { find: jest.fn() };
const mockAuthLogService = { log: jest.fn() };
const mockMailService = { sendResetPasswordEmail: jest.fn() };
const mockJwtService = { sign: jest.fn().mockReturnValue('mock-access-token') };
const mockConfigService = { get: jest.fn().mockReturnValue('15m') };

// ── Test User ──
const TEST_USER = {
  id: 'user-uuid-001',
  username: 'admin',
  password_hash: '', // sẽ hash trong beforeAll
  is_active: true,
  failed_login_count: 0,
  locked_until: null,
  password_changed_at: null,
  password_history: null,
};

describe('AuthService', () => {
  let service: AuthService;

  beforeAll(async () => {
    TEST_USER.password_hash = await bcrypt.hash('Admin@123', 10);
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(UserRole), useValue: mockUserRoleRepo },
        {
          provide: getRepositoryToken(RolePrivilege),
          useValue: mockRolePrivilegeRepo,
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshRepo,
        },
        {
          provide: getRepositoryToken(PasswordResetToken),
          useValue: mockResetTokenRepo,
        },
        { provide: getRepositoryToken(Employee), useValue: mockEmployeeRepo },
        {
          provide: getRepositoryToken(ProjectAssignment),
          useValue: mockAssignmentRepo,
        },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AuthLogService, useValue: mockAuthLogService },
        { provide: MailService, useValue: mockMailService },
        {
          provide: TokenBlocklistService,
          useValue: {
            revoke: jest.fn(),
            isRevoked: jest.fn().mockResolvedValue(false),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();

    mockUserRoleRepo.find.mockResolvedValue([
      { role: { id: 'role-1', role_code: 'SUPER_ADMIN' } },
    ]);
    mockRolePrivilegeRepo.find.mockResolvedValue([
      { privilege: { privilege_code: 'VIEW_PO' } },
      { privilege: { privilege_code: 'CREATE_PO' } },
    ]);
    mockRefreshRepo.find.mockResolvedValue([]);
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // KỊCH BẢN 1: Đăng nhập thành công
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('Kịch bản 1: Đăng nhập thành công', () => {
    it('trả về access_token + refresh_token + user info', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...TEST_USER });
      const result = await service.login(
        'admin',
        'Admin@123',
        '127.0.0.1',
        'Jest',
      );

      expect(result).toHaveProperty('access_token', 'mock-access-token');
      expect(result).toHaveProperty('refresh_token');
      expect(result.refresh_token).toHaveLength(64);
      expect(result.user).toEqual({
        id: 'user-uuid-001',
        username: 'admin',
        role: 'SUPER_ADMIN',
        privileges: ['VIEW_PO', 'CREATE_PO'],
      });
      expect(mockUserRepo.update).toHaveBeenCalledWith('user-uuid-001', {
        failed_login_count: 0,
        locked_until: null,
      });
      expect(mockAuthLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'LOGIN_SUCCESS' }),
      );
      expect(mockRefreshRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'user-uuid-001' }),
      );
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // KỊCH BẢN 2: Sai mật khẩu
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('Kịch bản 2: Sai mật khẩu', () => {
    it('trả về 401 + tăng failed_login_count', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...TEST_USER });
      await expect(
        service.login('admin', 'wrong', '127.0.0.1', 'Jest'),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockUserRepo.update).toHaveBeenCalledWith('user-uuid-001', {
        failed_login_count: 1,
        locked_until: null,
      });
      expect(mockAuthLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'LOGIN_FAILED' }),
      );
    });

    it('trả về 401 cho username không tồn tại', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      await expect(
        service.login('ghost', 'any', '127.0.0.1', 'Jest'),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockAuthLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ failureReason: 'Tài khoản không tồn tại' }),
      );
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // KỊCH BẢN 3: Account Lockout
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('Kịch bản 3: Account Lockout', () => {
    it('lần sai thứ 5 → khoá tài khoản 15 phút', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        ...TEST_USER,
        failed_login_count: 4,
      });
      await expect(
        service.login('admin', 'wrong', '127.0.0.1', 'Jest'),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockUserRepo.update).toHaveBeenCalledWith('user-uuid-001', {
        failed_login_count: 5,
        locked_until: expect.any(Date),
      });
      expect(mockAuthLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'ACCOUNT_LOCKED' }),
      );
    });

    it('tài khoản đang bị khoá → từ chối dù mật khẩu đúng', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        ...TEST_USER,
        failed_login_count: 5,
        locked_until: new Date(Date.now() + 10 * 60 * 1000),
      });
      await expect(
        service.login('admin', 'Admin@123', '127.0.0.1', 'Jest'),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockAuthLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          failureReason: expect.stringContaining('tạm khoá'),
        }),
      );
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // KỊCH BẢN 4: Forgot Password — Token hết hạn
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('Kịch bản 4: Reset Password — Token hết hạn', () => {
    it('token đã hết hạn → 401', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');

      mockResetTokenRepo.findOne.mockResolvedValue({
        id: 'reset-001',
        user_id: 'user-uuid-001',
        token_hash: tokenHash,
        expires_at: new Date(Date.now() - 60 * 1000), // Hết hạn 1 phút trước
        is_used: false,
      });

      await expect(
        service.resetPassword(rawToken, 'NewPass@123', '127.0.0.1', 'Jest'),
      ).rejects.toThrow(UnauthorizedException);

      await expect(
        service.resetPassword(rawToken, 'NewPass@123', '127.0.0.1', 'Jest'),
      ).rejects.toThrow('hết hạn');
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // KỊCH BẢN 5: Reset Password — Token đã dùng 1 lần
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('Kịch bản 5: Reset Password — Token đã dùng 1 lần', () => {
    it('token is_used = true → 401 không cho dùng lại', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');

      mockResetTokenRepo.findOne.mockResolvedValue({
        id: 'reset-002',
        user_id: 'user-uuid-001',
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 30 * 60 * 1000), // Còn 30 phút
        is_used: true, // ĐÃ DÙNG
      });

      await expect(
        service.resetPassword(rawToken, 'NewPass@123', '127.0.0.1', 'Jest'),
      ).rejects.toThrow(UnauthorizedException);

      await expect(
        service.resetPassword(rawToken, 'NewPass@123', '127.0.0.1', 'Jest'),
      ).rejects.toThrow('đã được sử dụng');
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // KỊCH BẢN 6: Reset Password thành công
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('Kịch bản 6: Reset Password thành công', () => {
    it('token hợp lệ → đổi password + revoke sessions + audit log', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');

      mockResetTokenRepo.findOne.mockResolvedValue({
        id: 'reset-003',
        user_id: 'user-uuid-001',
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 30 * 60 * 1000),
        is_used: false,
      });

      const result = await service.resetPassword(
        rawToken,
        'NewPass@123',
        '127.0.0.1',
        'Jest',
      );

      // Token đánh dấu đã dùng
      expect(mockResetTokenRepo.update).toHaveBeenCalledWith('reset-003', {
        is_used: true,
      });

      // Password updated + lockout reset
      expect(mockUserRepo.update).toHaveBeenCalledWith(
        'user-uuid-001',
        expect.objectContaining({
          password_hash: expect.any(String),
          password_changed_at: expect.any(Date),
          failed_login_count: 0,
          locked_until: null,
        }),
      );

      // Tất cả refresh tokens bị revoke (force re-login)
      expect(mockRefreshRepo.update).toHaveBeenCalledWith(
        { user_id: 'user-uuid-001' },
        { is_revoked: true },
      );

      // Audit log
      expect(mockAuthLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'PASSWORD_RESET',
          metadata: { action: 'completed' },
        }),
      );

      expect(result.message).toContain('thành công');
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // KỊCH BẢN 7: Forgot Password — Không tiết lộ user tồn tại
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('Kịch bản 7: Forgot Password — Bảo mật thông tin', () => {
    it('user tồn tại → gửi email + trả generic message', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...TEST_USER });

      const result = await service.forgotPassword('admin', '127.0.0.1', 'Jest');

      expect(result.message).toContain('Nếu tài khoản tồn tại');
      expect(mockMailService.sendResetPasswordEmail).toHaveBeenCalledWith(
        'admin',
        expect.any(String),
      );
      expect(mockResetTokenRepo.save).toHaveBeenCalled();
    });

    it('user KHÔNG tồn tại → trả CÙNG message (không tiết lộ)', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      const result = await service.forgotPassword(
        'ghost@evil.com',
        '127.0.0.1',
        'Jest',
      );

      // CÙNG message — không tiết lộ user có tồn tại hay không
      expect(result.message).toContain('Nếu tài khoản tồn tại');
      // KHÔNG gửi email
      expect(mockMailService.sendResetPasswordEmail).not.toHaveBeenCalled();
      // KHÔNG tạo token
      expect(mockResetTokenRepo.save).not.toHaveBeenCalled();
    });
  });
});
