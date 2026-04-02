import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

// ── Mapping tên constraint / column → tên hiển thị tiếng Việt ──
const FIELD_LABELS: Record<string, string> = {
  project_code: 'Mã dự án',
  project_name: 'Tên dự án',
  email: 'Email',
  username: 'Tên đăng nhập',
  employee_code: 'Mã nhân viên',
  phone: 'Số điện thoại',
  organization_code: 'Mã tổ chức',
  organization_name: 'Tên tổ chức',
  supplier_code: 'Mã nhà cung cấp',
  order_number: 'Mã phiếu',
  code: 'Mã',
  item_code: 'Mã hạng mục',
  name: 'Tên',
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  private readonly logDir = path.resolve(process.cwd(), 'logs');

  constructor() {
    // Đảm bảo thư mục logs tồn tại
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Hệ thống đang bận, vui lòng thử lại sau.';

    // ── 1. Lỗi nghiệp vụ từ NestJS (BadRequest, NotFound, Conflict, ...) ──
    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const res = exceptionResponse as Record<string, unknown>;
        // ValidationPipe trả về { message: string[] } → gộp lại
        if (Array.isArray(res['message'])) {
          message = (res['message'] as string[]).join('; ');
        } else if (typeof res['message'] === 'string') {
          message = res['message'];
        }
      }
    }

    // ── 2. Lỗi Database (TypeORM QueryFailedError) ──
    else if (exception instanceof QueryFailedError) {
      const pgError = exception as QueryFailedError & {
        code?: string;
        detail?: string;
        constraint?: string;
        table?: string;
      };

      // Log chi tiết cho developer, KHÔNG trả về client
      this.logger.error(
        `[DB] ${request.method} ${request.url} | code=${pgError.code} | constraint=${pgError.constraint}`,
        pgError.detail || pgError.message,
      );

      switch (pgError.code) {
        // ── 23505: Unique Violation → 409 Conflict ──
        case '23505': {
          statusCode = HttpStatus.CONFLICT;
          const fieldName = this.extractFieldFromDetail(
            pgError.detail,
            pgError.constraint,
          );
          const fieldLabel = fieldName
            ? FIELD_LABELS[fieldName] || fieldName
            : 'dữ liệu';
          const duplicateValue = this.extractValueFromDetail(pgError.detail);

          if (duplicateValue) {
            message = `${fieldLabel} "${duplicateValue}" đã tồn tại trong hệ thống. Vui lòng chọn giá trị khác.`;
          } else {
            message = `${fieldLabel} đã tồn tại trong hệ thống. Vui lòng chọn giá trị khác.`;
          }
          break;
        }

        // ── 23503: Foreign Key Violation → 409 Conflict ──
        case '23503': {
          statusCode = HttpStatus.CONFLICT;
          message =
            'Không thể thực hiện: Dữ liệu liên quan vẫn còn được sử dụng ở nơi khác.';
          break;
        }

        // ── 23502: Not Null Violation → 400 Bad Request ──
        case '23502': {
          statusCode = HttpStatus.BAD_REQUEST;
          const col = pgError.detail?.match(/column "(\w+)"/)?.[1];
          const colLabel = col ? FIELD_LABELS[col] || col : 'trường bắt buộc';
          message = `Thiếu dữ liệu bắt buộc: ${colLabel} không được để trống.`;
          break;
        }

        // ── 23514: Check Constraint Violation → 400 ──
        case '23514': {
          statusCode = HttpStatus.BAD_REQUEST;
          message =
            'Dữ liệu không hợp lệ: giá trị vượt ngoài phạm vi cho phép.';
          break;
        }

        // ── Các lỗi DB khác → 400 ──
        default: {
          statusCode = HttpStatus.BAD_REQUEST;
          message =
            'Lỗi truy vấn cơ sở dữ liệu. Vui lòng kiểm tra lại dữ liệu đầu vào.';
        }
      }

      // Ghi log lỗi DB vào file
      this.writeLogToFile('db-error', {
        timestamp: new Date().toISOString(),
        method: request.method,
        url: request.url,
        pgCode: pgError.code,
        constraint: pgError.constraint,
        detail: pgError.detail,
        message: pgError.message,
      });
    }

    // ── 3. Entity Not Found ──
    else if (exception instanceof EntityNotFoundError) {
      statusCode = HttpStatus.NOT_FOUND;
      message = 'Không tìm thấy bản ghi yêu cầu trong hệ thống.';
    }

    // ── 4. Lỗi hệ thống không xác định → 500 ──
    else {
      this.logger.error(
        `[UnhandledException] ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );

      // Ghi stack trace vào file log
      this.writeLogToFile('error', {
        timestamp: new Date().toISOString(),
        method: request.method,
        url: request.url,
        error:
          exception instanceof Error ? exception.message : String(exception),
        stack: exception instanceof Error ? exception.stack : undefined,
      });
    }

    response.status(statusCode).json({
      status: 'error',
      message,
      data: null,
    });
  }

  /**
   * Trích xuất tên trường từ PostgreSQL detail string.
   * VD: "Key (project_code)=(PRJ-001) already exists." → "project_code"
   * Hoặc parse từ constraint name: "UQ_xxx_project_code" → "project_code"
   */
  private extractFieldFromDetail(
    detail?: string,
    constraint?: string,
  ): string | null {
    // Ưu tiên parse từ detail (chính xác hơn)
    if (detail) {
      const match = detail.match(/Key \(([^)]+)\)/);
      if (match) {
        // Có thể là composite key: "(project_id, item_code)" → lấy phần tử cuối
        const fields = match[1].split(',').map((f) => f.trim());
        return fields[fields.length - 1];
      }
    }

    // Fallback: parse từ constraint name
    if (constraint) {
      // VD: "UQ_project_wbs_code" → tách lấy phần cuối
      const parts = constraint.split('_');
      if (parts.length >= 2) {
        return parts[parts.length - 1];
      }
    }

    return null;
  }

  /**
   * Trích xuất giá trị bị trùng từ detail.
   * VD: "Key (project_code)=(PRJ-001) already exists." → "PRJ-001"
   */
  private extractValueFromDetail(detail?: string): string | null {
    if (!detail) return null;
    const match = detail.match(/=\(([^)]+)\)/);
    return match ? match[1] : null;
  }

  /**
   * Ghi log vào file theo ngày. File: logs/error-YYYY-MM-DD.log
   */
  private writeLogToFile(prefix: string, data: Record<string, unknown>): void {
    try {
      const date = new Date().toISOString().split('T')[0];
      const filePath = path.join(this.logDir, `${prefix}-${date}.log`);
      const line = JSON.stringify(data) + '\n';
      fs.appendFileSync(filePath, line, 'utf-8');
    } catch {
      // Không để lỗi ghi log gây crash app
    }
  }
}
