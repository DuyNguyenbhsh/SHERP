import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user-role.entity';
import { RolePrivilege } from '../users/entities/role-privilege.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { AuthLogService } from './auth-log.service';
import { MailService } from './mail.service';
import { AuthEvent } from './entities/auth-log.entity';
import { checkLockout, applyFailedAttempt } from './domain/logic/lockout.logic';
import { validatePasswordPolicy } from './domain/logic/password-policy.logic';
import { Employee } from '../users/entities/employee.entity';
import { ProjectAssignment } from '../projects/entities/project-assignment.entity';

const MAX_SESSIONS = 5;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(UserRole) private userRoleRepo: Repository<UserRole>,
    @InjectRepository(RolePrivilege)
    private rolePrivilegeRepo: Repository<RolePrivilege>,
    @InjectRepository(RefreshToken)
    private refreshRepo: Repository<RefreshToken>,
    @InjectRepository(PasswordResetToken)
    private resetTokenRepo: Repository<PasswordResetToken>,
    @InjectRepository(Employee) private employeeRepo: Repository<Employee>,
    @InjectRepository(ProjectAssignment)
    private assignmentRepo: Repository<ProjectAssignment>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private authLogService: AuthLogService,
    private mailService: MailService,
  ) {}

  // ─── LOGIN (có Lockout + Audit Log + Refresh Token) ──────────────
  async login(
    username: string,
    password: string,
    ip?: string,
    userAgent?: string,
  ) {
    // 1. Tìm user
    const user = await this.userRepo.findOne({ where: { username } });
    if (!user) {
      await this.authLogService.log({
        usernameInput: username,
        event: AuthEvent.LOGIN_FAILED,
        ip,
        userAgent,
        failureReason: 'Tài khoản không tồn tại',
      });
      throw new UnauthorizedException('Sai tài khoản hoặc mật khẩu');
    }

    // 2. Kiểm tra tài khoản bị khoá
    if (!user.is_active) {
      await this.authLogService.log({
        userId: user.id,
        usernameInput: username,
        event: AuthEvent.LOGIN_FAILED,
        ip,
        userAgent,
        failureReason: 'Tài khoản đã bị vô hiệu hoá',
      });
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hoá');
    }

    // 3. Kiểm tra lockout (brute-force protection)
    const lockoutResult = checkLockout(
      user.failed_login_count,
      user.locked_until,
    );
    if (lockoutResult.locked) {
      await this.authLogService.log({
        userId: user.id,
        usernameInput: username,
        event: AuthEvent.LOGIN_FAILED,
        ip,
        userAgent,
        failureReason: `Tài khoản tạm khoá, còn ${lockoutResult.remainingMinutes} phút`,
      });
      throw new UnauthorizedException(
        `Tài khoản tạm khoá do nhập sai quá nhiều lần. Vui lòng thử lại sau ${lockoutResult.remainingMinutes} phút.`,
      );
    }

    // 4. Verify mật khẩu
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      const failResult = applyFailedAttempt(user.failed_login_count);
      await this.userRepo.update(user.id, {
        failed_login_count: failResult.newCount,
        locked_until: failResult.lockUntil,
      });

      if (failResult.shouldLock) {
        await this.authLogService.log({
          userId: user.id,
          usernameInput: username,
          event: AuthEvent.ACCOUNT_LOCKED,
          ip,
          userAgent,
          failureReason: `Khoá sau ${failResult.newCount} lần nhập sai`,
        });
        throw new UnauthorizedException(
          'Tài khoản đã bị khoá 15 phút do nhập sai mật khẩu 5 lần liên tiếp.',
        );
      }

      await this.authLogService.log({
        userId: user.id,
        usernameInput: username,
        event: AuthEvent.LOGIN_FAILED,
        ip,
        userAgent,
        failureReason: `Sai mật khẩu (lần ${failResult.newCount}/5)`,
      });
      throw new UnauthorizedException('Sai tài khoản hoặc mật khẩu');
    }

    // 5. Login thành công → reset lockout
    await this.userRepo.update(user.id, {
      failed_login_count: 0,
      locked_until: null,
    });

    // 6. Aggregate privileges
    const { privilegeCodes, roleName } = await this.aggregatePrivileges(
      user.id,
    );

    // 7. Tạo Access Token (15 phút)
    const payload = {
      sub: user.id,
      username: user.username,
      privileges: privilegeCodes,
    };
    const access_token = this.jwtService.sign(payload);

    // 8. Tạo Refresh Token (7 ngày)
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const refreshHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');
    const refreshExpiresIn =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
    const refreshDays = parseInt(refreshExpiresIn) || 7;
    const expiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);

    // 9. Giới hạn sessions (max 5)
    await this.enforceMaxSessions(user.id);

    // 10. Lưu refresh token
    await this.refreshRepo.save({
      user_id: user.id,
      token_hash: refreshHash,
      device_info: `${userAgent || 'unknown'} | ${ip || 'unknown'}`,
      expires_at: expiresAt,
    });

    // 11. Ghi audit log
    await this.authLogService.log({
      userId: user.id,
      usernameInput: username,
      event: AuthEvent.LOGIN_SUCCESS,
      ip,
      userAgent,
    });

    return {
      access_token,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: roleName,
      },
    };
  }

  // ─── REFRESH TOKEN ───────────────────────────────────────────────
  async refreshTokens(refreshToken: string, ip?: string, userAgent?: string) {
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const stored = await this.refreshRepo.findOne({
      where: { token_hash: tokenHash },
    });

    if (!stored || stored.expires_at < new Date()) {
      throw new UnauthorizedException(
        'Refresh token không hợp lệ hoặc đã hết hạn',
      );
    }

    // Phát hiện token reuse attack
    if (stored.is_revoked) {
      await this.refreshRepo.update(
        { user_id: stored.user_id },
        { is_revoked: true },
      );
      await this.authLogService.log({
        userId: stored.user_id,
        usernameInput: 'token-reuse',
        event: AuthEvent.LOGOUT,
        ip,
        userAgent,
        failureReason: 'Phát hiện token reuse attack — huỷ toàn bộ sessions',
      });
      throw new UnauthorizedException(
        'Phát hiện bất thường bảo mật. Vui lòng đăng nhập lại.',
      );
    }

    // Revoke token cũ
    await this.refreshRepo.update(stored.id, { is_revoked: true });

    // Tạo token mới
    const { privilegeCodes, roleName } = await this.aggregatePrivileges(
      stored.user_id,
    );
    const user = await this.userRepo.findOne({ where: { id: stored.user_id } });
    if (!user) throw new UnauthorizedException('Tài khoản không còn tồn tại');

    const payload = {
      sub: user.id,
      username: user.username,
      privileges: privilegeCodes,
    };
    const access_token = this.jwtService.sign(payload);

    const newRefreshToken = crypto.randomBytes(32).toString('hex');
    const newHash = crypto
      .createHash('sha256')
      .update(newRefreshToken)
      .digest('hex');
    const refreshDays =
      parseInt(
        this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7',
      ) || 7;
    const expiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);

    await this.refreshRepo.save({
      user_id: user.id,
      token_hash: newHash,
      device_info: `${userAgent || 'unknown'} | ${ip || 'unknown'}`,
      expires_at: expiresAt,
    });

    await this.authLogService.log({
      userId: user.id,
      usernameInput: user.username,
      event: AuthEvent.TOKEN_REFRESH,
      ip,
      userAgent,
    });

    return {
      access_token,
      refresh_token: newRefreshToken,
      user: { id: user.id, username: user.username, role: roleName },
    };
  }

  // ─── LOGOUT ──────────────────────────────────────────────────────
  async logout(
    userId: string,
    refreshToken?: string,
    ip?: string,
    userAgent?: string,
  ) {
    if (refreshToken) {
      const tokenHash = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');
      await this.refreshRepo.update(
        { token_hash: tokenHash, user_id: userId },
        { is_revoked: true },
      );
    }

    await this.authLogService.log({
      userId,
      usernameInput: 'logout',
      event: AuthEvent.LOGOUT,
      ip,
      userAgent,
    });
  }

  // ─── GET PROFILE + SCOPE RESOLUTION ──────────────────────────────
  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['employee'],
    });
    if (!user) {
      throw new UnauthorizedException(
        'Token không hợp lệ hoặc tài khoản đã bị xóa',
      );
    }

    const { roleName } = await this.aggregatePrivileges(user.id);

    // Base response
    const result: Record<string, any> = {
      id: user.id,
      username: user.username,
      role: roleName,
    };

    // Scope Resolution: Employee → Position → Org Unit → Project Scope
    if (user.employee) {
      const employee = await this.employeeRepo.findOne({
        where: { id: user.employee.id },
        relations: ['position', 'department'],
      });

      if (employee?.position) {
        result.position = {
          code: employee.position.position_code,
          name: employee.position.position_name,
          scope: employee.position.scope,
        };
      }

      if (employee?.department) {
        result.org_unit = {
          code: employee.department.organization_code,
          name: employee.department.organization_name,
          type: employee.department.org_type,
        };
      }

      // Determine project scope
      const scope = employee?.position?.scope || 'CENTRAL';
      if (scope === 'SITE') {
        // SITE: chỉ xem projects assigned
        const assignments = await this.assignmentRepo.find({
          where: { employee_id: employee!.id, is_active: true },
          select: ['project_id'],
        });
        result.project_scope = {
          type: 'SITE',
          project_ids: assignments.map((a) => a.project_id),
        };
      } else {
        // CENTRAL: xem toàn portfolio
        result.project_scope = {
          type: 'CENTRAL',
          project_ids: null,
        };
      }
    }

    return result;
  }

  // ─── FORGOT PASSWORD ──────────────────────────────────────────────
  async forgotPassword(username: string, ip?: string, userAgent?: string) {
    // Luôn trả cùng 1 message — KHÔNG tiết lộ user có tồn tại hay không
    const genericMessage =
      'Nếu tài khoản tồn tại trong hệ thống, bạn sẽ nhận được email hướng dẫn đặt lại mật khẩu.';

    const user = await this.userRepo.findOne({ where: { username } });
    if (!user) {
      // Không tiết lộ — vẫn trả thành công
      return { message: genericMessage };
    }

    // Vô hiệu hoá tất cả token reset cũ
    await this.resetTokenRepo.update(
      { user_id: user.id, is_used: false },
      { is_used: true },
    );

    // Tạo token reset (hạn 30 phút)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await this.resetTokenRepo.save({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

    // Gửi email (hoặc console log nếu chưa có SMTP)
    const email = user.username; // username = email trong SH-GROUP
    await this.mailService.sendResetPasswordEmail(email, rawToken);

    await this.authLogService.log({
      userId: user.id,
      usernameInput: username,
      event: AuthEvent.PASSWORD_RESET,
      ip,
      userAgent,
      metadata: { action: 'requested' },
    });

    return { message: genericMessage };
  }

  // ─── RESET PASSWORD ─────────────────────────────────────────────
  async resetPassword(
    token: string,
    newPassword: string,
    ip?: string,
    userAgent?: string,
  ) {
    // Validate password policy
    const policy = validatePasswordPolicy(newPassword);
    if (!policy.valid) {
      throw new UnauthorizedException(policy.errors.join('. '));
    }

    // Tìm token
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const stored = await this.resetTokenRepo.findOne({
      where: { token_hash: tokenHash },
    });

    if (!stored) {
      throw new UnauthorizedException('Link đặt lại mật khẩu không hợp lệ.');
    }

    if (stored.is_used) {
      throw new UnauthorizedException('Link đặt lại mật khẩu đã được sử dụng.');
    }

    if (stored.expires_at < new Date()) {
      throw new UnauthorizedException(
        'Link đặt lại mật khẩu đã hết hạn (30 phút).',
      );
    }

    // Đánh dấu token đã dùng
    await this.resetTokenRepo.update(stored.id, { is_used: true });

    // Hash mật khẩu mới
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    // Cập nhật password + reset lockout
    await this.userRepo.update(stored.user_id, {
      password_hash: newHash,
      password_changed_at: new Date(),
      failed_login_count: 0,
      locked_until: null,
    });

    // Huỷ tất cả refresh tokens (force re-login)
    await this.refreshRepo.update(
      { user_id: stored.user_id },
      { is_revoked: true },
    );

    await this.authLogService.log({
      userId: stored.user_id,
      usernameInput: 'password-reset',
      event: AuthEvent.PASSWORD_RESET,
      ip,
      userAgent,
      metadata: { action: 'completed' },
    });

    return {
      message: 'Mật khẩu đã được đặt lại thành công. Vui lòng đăng nhập.',
    };
  }

  // ─── PRIVATE HELPERS ─────────────────────────────────────────────
  private async aggregatePrivileges(userId: string) {
    const userRoles = await this.userRoleRepo.find({
      where: { user: { id: userId } },
      relations: ['role'],
    });

    const roleIds = userRoles.map((ur) => ur.role.id);
    let privilegeCodes: string[] = [];

    if (roleIds.length > 0) {
      const rolePrivileges = await this.rolePrivilegeRepo.find({
        where: { role: { id: In(roleIds) } },
        relations: ['privilege'],
      });
      privilegeCodes = [
        ...new Set(rolePrivileges.map((rp) => rp.privilege.privilege_code)),
      ];
    }

    const roleName =
      userRoles.length > 0 ? userRoles[0].role.role_code : 'USER';
    return { privilegeCodes, roleName };
  }

  private async enforceMaxSessions(userId: string) {
    const activeSessions = await this.refreshRepo.find({
      where: { user_id: userId, is_revoked: false },
      order: { created_at: 'ASC' },
    });

    if (activeSessions.length >= MAX_SESSIONS) {
      const toRevoke = activeSessions.slice(
        0,
        activeSessions.length - MAX_SESSIONS + 1,
      );
      for (const session of toRevoke) {
        await this.refreshRepo.update(session.id, { is_revoked: true });
      }
    }
  }
}
