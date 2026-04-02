import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Định nghĩa cấu trúc chuẩn của mọi API response thành công
export interface ApiResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T> | T
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T> | T> {
    return next.handle().pipe(
      map((payload) => {
        // StreamableFile (Excel, PDF, etc.) — không wrap, trả nguyên binary
        if (payload instanceof StreamableFile) {
          return payload as unknown as T;
        }

        // Nếu Service/Controller đã trả về object có dạng { message, data }
        if (
          payload !== null &&
          typeof payload === 'object' &&
          'message' in payload &&
          'data' in payload
        ) {
          return {
            status: true,
            message: payload.message,
            data: payload.data,
          };
        }

        // Trường hợp Service trả về thẳng dữ liệu (entity, array, v.v.)
        return {
          status: true,
          message: 'Thành công',
          data: payload ?? null,
        };
      }),
    );
  }
}
