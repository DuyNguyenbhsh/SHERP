import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PRIVILEGES_KEY } from '../decorators/require-privilege.decorator';

@Injectable()
export class PrivilegeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Đọc xem route này đang yêu cầu những quyền nào (từ @RequirePrivilege)
    const requiredPrivileges = this.reflector.getAllAndOverride<string[]>(
      PRIVILEGES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Nếu route không gắn @RequirePrivilege → không yêu cầu quyền đặc biệt, cho qua
    if (!requiredPrivileges || requiredPrivileges.length === 0) return true;

    // 2. Lấy thông tin user đã được JwtStrategy giải mã từ Token
    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.privileges) {
      throw new ForbiddenException(
        'Tài khoản của bạn chưa được cấp bất kỳ quyền nào!',
      );
    }

    // 3. Kiểm tra user có sở hữu ít nhất 1 trong các quyền yêu cầu không
    const hasPrivilege = requiredPrivileges.some((p) =>
      user.privileges.includes(p),
    );

    if (!hasPrivilege) {
      throw new ForbiddenException(
        `Bạn không có quyền thực hiện thao tác này. Yêu cầu: [${requiredPrivileges.join(' | ')}]`,
      );
    }

    return true;
  }
}
