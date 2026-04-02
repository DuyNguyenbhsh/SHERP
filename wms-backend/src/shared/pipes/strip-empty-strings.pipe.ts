import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

// Chuyển chuỗi rỗng "" thành undefined để @IsOptional() hoạt động đúng
// Giải quyết vấn đề Swagger UI gửi "" cho các trường optional
@Injectable()
export class StripEmptyStringsPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type !== 'body' || typeof value !== 'object' || !value) {
      return value;
    }
    return this.stripEmpty(value);
  }

  private stripEmpty(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map((item) =>
        typeof item === 'object' && item ? this.stripEmpty(item) : item,
      );
    }
    const result: any = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val === '') {
        // Chuỗi rỗng → undefined → @IsOptional() sẽ bỏ qua validation
        result[key] = undefined;
      } else if (
        typeof val === 'object' &&
        val !== null &&
        !(val instanceof Date)
      ) {
        result[key] = this.stripEmpty(val);
      } else {
        result[key] = val;
      }
    }
    return result;
  }
}
