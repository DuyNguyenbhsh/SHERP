import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsNumber,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateTransactionDto {
  @ApiProperty({ description: 'UUID loại chi phí' })
  @IsUUID('4', { message: 'category_id phải là UUID hợp lệ' })
  category_id: string;

  @ApiProperty({ description: 'Số tiền (VNĐ)', example: 5000000000 })
  @IsNumber({}, { message: 'Số tiền phải là số' })
  @Min(0, { message: 'Số tiền không được âm' })
  amount: number;

  @ApiProperty({ description: 'Ngày giao dịch', example: '2026-03-15' })
  @IsDateString(
    {},
    { message: 'Ngày giao dịch phải đúng định dạng YYYY-MM-DD' },
  )
  transaction_date: string;

  @ApiPropertyOptional({
    description: 'Mô tả khoản chi',
    example: 'Thanh toán đợt 1',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({
    description: 'Loại chứng từ tham chiếu',
    example: 'PO_INVOICE',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  reference_type?: string;

  @ApiPropertyOptional({
    description: 'ID chứng từ tham chiếu',
    example: 'PO-260315-001',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  reference_id?: string;
}
