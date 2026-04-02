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
  IsEnum,
  ArrayMinSize,
} from 'class-validator';
import { VOType } from '../enums/monitoring.enum';

// ── Progress Report ──

export class WbsProgressItem {
  @IsUUID('4')
  wbs_id: string;

  @IsString()
  wbs_code: string;

  @IsString()
  wbs_name: string;

  @IsNumber()
  @Min(0)
  planned_percent: number;

  @IsNumber()
  @Min(0)
  actual_percent: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateProgressReportDto {
  @ApiProperty()
  @IsUUID('4')
  project_id: string;

  @ApiProperty({ example: 'W12-2026' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  report_period: string;

  @ApiProperty()
  @IsDateString()
  report_date: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  summary?: string;

  @ApiProperty({ type: [WbsProgressItem] })
  @IsArray()
  wbs_progress: WbsProgressItem[];

  /**
   * BẮT BUỘC khi submit: Ảnh hiện trường / Biên bản xác nhận sản lượng.
   * Không cho phép submit nếu mảng rỗng.
   */
  @ApiProperty({
    description: 'URLs ảnh hiện trường (BẮT BUỘC khi submit)',
    type: [String],
  })
  @IsArray()
  evidence_attachments: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  evidence_notes?: string;
}

export class ReportActionDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  comment?: string;
}

// ── Variation Order ──

export class CreateVODto {
  @ApiProperty()
  @IsUUID('4')
  project_id: string;

  @ApiProperty({ example: 'Điều chỉnh ngân sách giai đoạn 2' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: VOType })
  @IsEnum(VOType)
  vo_type: VOType;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  budget_after?: number;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  timeline_after?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  scope_description?: string;

  @ApiProperty({ description: 'Lý do thay đổi' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  attachments?: string[];
}

export class VOActionDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  comment?: string;
}
