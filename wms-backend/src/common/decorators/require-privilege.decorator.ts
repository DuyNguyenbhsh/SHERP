import { SetMetadata } from '@nestjs/common';

// Key dùng để đọc metadata trong PrivilegeGuard (phải khớp 100%)
export const PRIVILEGES_KEY = 'privileges';

// Decorator gắn lên Method hoặc Class để khai báo quyền cần có.
// Ví dụ: @RequirePrivilege('CREATE_PO', 'APPROVE_PO')
// → User phải có ít nhất 1 trong các quyền đó.
export const RequirePrivilege = (...privileges: string[]) =>
  SetMetadata(PRIVILEGES_KEY, privileges);
