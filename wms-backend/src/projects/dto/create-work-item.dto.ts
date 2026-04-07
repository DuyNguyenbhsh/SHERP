import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class CreateWorkItemDto {
  @ApiProperty({ description: 'Ma cong tac', example: 'CT-XD-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  item_code: string;

  @ApiProperty({ description: 'Ten cong tac', example: 'Do be tong cot' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  item_name: string;

  @ApiPropertyOptional({ description: 'Don vi tinh', example: 'm3' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  unit?: string;

  @ApiPropertyOptional({ description: 'Nhom cong tac', example: 'Ket cau' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  item_group?: string;

  @ApiPropertyOptional({ description: 'Tieu chuan ky thuat (JSON)' })
  @IsOptional()
  specifications?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Checklist kiem tra ITP (JSON array)' })
  @IsOptional()
  @IsArray()
  inspection_checklist?: Record<string, unknown>[];

  @ApiPropertyOptional({ description: 'Hinh anh tham chieu [{url, caption}]' })
  @IsOptional()
  @IsArray()
  reference_images?: { url: string; caption?: string }[];
}

export class UpdateWorkItemDto extends PartialType(CreateWorkItemDto) {}
