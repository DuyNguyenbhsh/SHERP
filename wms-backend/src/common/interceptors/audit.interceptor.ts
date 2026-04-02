import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { auditStore, AuditRequestContext } from '../audit/audit-context.store';
import { Request } from 'express';

/**
 * AuditInterceptor — chạy trước mỗi request, đưa thông tin user + change_reason
 * vào AsyncLocalStorage để TypeORM Subscriber có thể đọc được.
 *
 * Áp dụng trên controller cần audit:
 * @UseInterceptors(AuditInterceptor)
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as Record<string, unknown> | undefined;
    const body = request.body as Record<string, unknown> | undefined;

    const ctx: AuditRequestContext = {
      userId: user?.userId as string | undefined,
      username: user?.username as string | undefined,
      changeReason: body?.change_reason as string | undefined,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    };

    // Wrap phần còn lại của request pipeline trong AsyncLocalStorage context
    return new Observable((subscriber) => {
      auditStore.run(ctx, () => {
        next.handle().subscribe({
          next: (val) => subscriber.next(val),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
      });
    });
  }
}
