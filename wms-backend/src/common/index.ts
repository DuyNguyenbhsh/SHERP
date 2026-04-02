// ── Guards ──
export { JwtAuthGuard } from './guards/jwt-auth.guard';
export { PrivilegeGuard } from './guards/privilege.guard';

// ── Decorators ──
export {
  RequirePrivilege,
  PRIVILEGES_KEY,
} from './decorators/require-privilege.decorator';

// ── Interceptors ──
export { AuditInterceptor } from './interceptors/audit.interceptor';
export { TransformInterceptor } from './interceptors/transform.interceptor';

// ── Filters ──
export { GlobalExceptionFilter } from './filters/global-exception.filter';

// ── Pipes ──
export { StripEmptyStringsPipe } from './pipes/strip-empty-strings.pipe';

// ── Audit ──
export { auditStore, getAuditContext } from './audit/audit-context.store';
export type { AuditRequestContext } from './audit/audit-context.store';
