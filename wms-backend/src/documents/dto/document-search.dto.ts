import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { DocumentStatus } from '../enums/document.enum';

export class DocumentSearchDto {
  @ApiPropertyOptional({
    description: 'Từ khoá tìm kiếm (không phân biệt dấu)',
  })
  @IsString()
  @IsOptional()
  keyword?: string;

  @ApiPropertyOptional({ description: 'Lọc theo dự án' })
  @IsUUID()
  @IsOptional()
  project_id?: string;

  @ApiPropertyOptional({ enum: DocumentStatus })
  @IsEnum(DocumentStatus)
  @IsOptional()
  status?: DocumentStatus;

  @ApiPropertyOptional({
    description: 'Loại tài liệu',
    example: 'CONTRACT',
  })
  @IsString()
  @IsOptional()
  doc_type?: string;

  @ApiPropertyOptional({ type: [String], description: 'Tags (array)' })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Từ ngày (ISO)' })
  @IsDateString()
  @IsOptional()
  from_date?: string;

  @ApiPropertyOptional({ description: 'Đến ngày (ISO)' })
  @IsDateString()
  @IsOptional()
  to_date?: string;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ default: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  offset?: number = 0;
}
