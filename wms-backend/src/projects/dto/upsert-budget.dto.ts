import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';

export class UpsertBudgetDto {
  @ApiProperty({ description: 'UUID loại chi phí' })
  @IsUUID('4', { message: 'category_id phải là UUID hợp lệ' })
  category_id: string;

  @ApiProperty({ description: 'Số tiền dự kiến (VNĐ)', example: 5000000000 })
  @IsNumber({}, { message: 'Số tiền phải là số' })
  @Min(0, { message: 'Số tiền không được âm' })
  planned_amount: number;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}
