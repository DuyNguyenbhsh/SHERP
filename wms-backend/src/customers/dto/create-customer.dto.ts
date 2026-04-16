import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsEmail,
  IsBoolean,
  Min,
  MaxLength,
} from 'class-validator';
import {
  CustomerType,
  CustomerPaymentTerm,
} from '../../sales/enums/sales.enum';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Công ty TNHH ABC' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'ABC' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  short_name?: string;

  @ApiPropertyOptional({ example: '0312345678' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  tax_code?: string;

  @ApiPropertyOptional({ enum: CustomerType, default: CustomerType.RETAIL })
  @IsEnum(CustomerType)
  @IsOptional()
  customer_type?: CustomerType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  primary_contact?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  primary_phone?: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  primary_email?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  billing_address?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  shipping_address?: string;

  @ApiPropertyOptional({ enum: CustomerPaymentTerm })
  @IsEnum(CustomerPaymentTerm)
  @IsOptional()
  payment_term?: CustomerPaymentTerm;

  @ApiPropertyOptional({ example: 100000000, default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  credit_limit?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  is_blacklisted?: boolean;
}
