import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsNumber,
  Min,
  IsUUID,
  IsDateString,
  IsArray,
} from 'class-validator';

export class CreatePlanDto {
  @ApiProperty({ description: 'UUID dự án' })
  @IsUUID('4')
  project_id: string;

  @ApiProperty({
    description: 'Tiêu đề kế hoạch',
    example: 'Kế hoạch thi công Giai đoạn 1',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ description: 'Nội dung kế hoạch thi công' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Ngày bắt đầu kế hoạch' })
  @IsDateString()
  @IsOptional()
  planned_start?: string;

  @ApiPropertyOptional({ description: 'Ngày kết thúc kế hoạch' })
  @IsDateString()
  @IsOptional()
  planned_end?: string;

  @ApiPropertyOptional({ description: 'Tổng ngân sách kế hoạch (VNĐ)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  total_budget?: number;

  @ApiPropertyOptional({ description: 'Dữ liệu kế hoạch chi tiết (JSON)' })
  @IsOptional()
  plan_data?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Danh sách file đính kèm (paths)' })
  @IsArray()
  @IsOptional()
  attachments?: string[];
}

export class PlanActionDto {
  @ApiPropertyOptional({ description: 'Ghi chú / Lý do' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  comment?: string;
}
