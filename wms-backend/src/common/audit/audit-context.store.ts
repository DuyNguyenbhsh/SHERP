import { AsyncLocalStorage } from 'async_hooks';

export interface AuditRequestContext {
  userId?: string;
  username?: string;
  changeReason?: string;
  ip?: string;
  userAgent?: string;
}

/**
 * AsyncLocalStorage singleton — chia sẻ request context giữa
 * NestJS Interceptor và TypeORM Subscriber mà không cần dependency injection.
 */
export const auditStore = new AsyncLocalStorage<AuditRequestContext>();

export function getAuditContext(): AuditRequestContext | undefined {
  return auditStore.getStore();
}
