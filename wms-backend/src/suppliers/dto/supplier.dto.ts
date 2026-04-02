import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsInt,
  IsEmail,
  IsUUID,
  Min,
  MaxLength,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupplierType, PaymentTerm } from '../entities/supplier.entity';

export class CreateSupplierDto {
  // 1. Định danh pháp lý
  @ApiProperty({ description: 'Mã NCC', example: 'SUP-001' })
  @IsString()
  @IsNotEmpty({ message: 'Mã Nhà cung cấp không được để trống' })
  @MaxLength(50, { message: 'Mã NCC tối đa 50 ký tự' })
  supplier_code: string;

  @ApiProperty({ description: 'Tên nhà cung cấp', example: 'Công ty TNHH ABC' })
  @IsString()
  @IsNotEmpty({ message: 'Tên Nhà cung cấp không được để trống' })
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Tên viết tắt', example: 'ABC' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  short_name?: string;

  @ApiPropertyOptional({ description: 'Mã số thuế', example: '0312345678' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  tax_code?: string;

  @ApiPropertyOptional({
    description: 'Loại NCC',
    enum: ['DISTRIBUTOR', 'MANUFACTURER', 'SERVICE', 'INTERNAL'],
    example: 'DISTRIBUTOR',
  })
  @IsEnum(SupplierType, {
    message:
      'Loại NCC không hợp lệ (DISTRIBUTOR | MANUFACTURER | SERVICE | INTERNAL)',
  })
  @IsOptional()
  supplier_type?: SupplierType;

  // 2. Thông tin liên hệ & Site
  @ApiPropertyOptional({ description: 'Người liên hệ', example: 'Trần Thị B' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  contact_person?: string;

  @ApiPropertyOptional({ description: 'SĐT', example: '0909123456' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  primary_phone?: string;

  @ApiPropertyOptional({ description: 'Email', example: 'lienhe@abc.vn' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsOptional()
  @MaxLength(150)
  primary_email?: string;

  @IsString()
  @IsOptional()
  billing_address?: string;

  @IsString()
  @IsOptional()
  shipping_address?: string;

  // 3. Cấu hình Kế toán
  @IsEnum(PaymentTerm, {
    message:
      'Điều khoản thanh toán không hợp lệ (COD | NET15 | NET30 | EOM | PREPAY)',
  })
  @IsOptional()
  payment_term?: PaymentTerm;

  @IsNumber({}, { message: 'Hạn mức công nợ phải là số' })
  @Min(0, { message: 'Hạn mức công nợ không được âm' })
  @IsOptional()
  debt_limit?: number;

  @IsUUID('4', { message: 'liability_account_id phải là UUID hợp lệ' })
  @IsOptional()
  liability_account_id?: string;

  @IsUUID('4', { message: 'prepayment_account_id phải là UUID hợp lệ' })
  @IsOptional()
  prepayment_account_id?: string;

  // 4. Mở rộng
  @IsObject({ message: 'dynamic_attributes phải là JSON object' })
  @IsOptional()
  dynamic_attributes?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateSupplierDto extends CreateSupplierDto {
  @ApiPropertyOptional({ description: 'Trạng thái hoạt động', example: true })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  // Khóa Version để check tranh chấp khi update (Optimistic Locking)
  @ApiPropertyOptional({
    description: 'Phiên bản (Optimistic Locking)',
    example: 1,
  })
  @IsInt()
  @IsOptional()
  version?: number;
}
