import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsDateString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  Min,
  Max,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QuoteLineDto {
  @ApiProperty()
  @IsUUID()
  product_id: string;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1)
  qty: number;

  @ApiProperty({ example: 1500000 })
  @IsNumber()
  @Min(0)
  unit_price: number;

  @ApiPropertyOptional({ example: 5, default: 0 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  discount_percent?: number;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  tax_percent?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateQuoteDto {
  @ApiProperty()
  @IsUUID()
  customer_id: string;

  @ApiProperty({ example: '2026-04-16' })
  @IsDateString()
  effective_date: string;

  @ApiProperty({ example: '2026-05-16' })
  @IsDateString()
  expiry_date: string;

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

export class UpdateQuoteDto extends PartialType(CreateQuoteDto) {}
