import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsDateString,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CustomerPaymentTerm } from '../enums/sales.enum';
import { QuoteLineDto } from './create-quote.dto';

export class CreateSalesOrderDto {
  @ApiProperty()
  @IsUUID()
  customer_id: string;

  @ApiPropertyOptional({ description: 'Nếu convert từ Quote' })
  @IsUUID()
  @IsOptional()
  quote_id?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  required_delivery_date?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  ship_to_address?: string;

  @ApiPropertyOptional({ enum: CustomerPaymentTerm })
  @IsEnum(CustomerPaymentTerm)
  @IsOptional()
  payment_term?: CustomerPaymentTerm;

  @ApiPropertyOptional({
    description:
      'Lý do bypass credit limit (bắt buộc nếu vượt hạn mức và có privilege)',
  })
  @IsString()
  @IsOptional()
  bypass_reason?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  sales_rep_id?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [QuoteLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteLineDto)
  @ArrayMinSize(1)
  lines: QuoteLineDto[];
}

export class CancelSalesOrderDto {
  @ApiProperty({ description: 'Lý do hủy' })
  @IsString()
  reason: string;
}
