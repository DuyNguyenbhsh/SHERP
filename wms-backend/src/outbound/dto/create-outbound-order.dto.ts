import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsArray,
  IsInt,
  IsNumber,
  IsDateString,
  Min,
  MaxLength,
  ArrayNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OutboundType } from '../enums/outbound.enum';

// DTO cho từng dòng hàng xuất
export class CreateOutboundLineDto {
  @ApiProperty({
    description: 'UUID sản phẩm',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'product_id phải là UUID hợp lệ' })
  product_id: string;

  @ApiProperty({ description: 'Số lượng yêu cầu xuất', example: 50 })
  @IsInt({ message: 'Số lượng yêu cầu phải là số nguyên' })
  @Min(1, { message: 'Số lượng yêu cầu phải lớn hơn 0' })
  requested_qty: number;

  @ApiPropertyOptional({ description: 'Số lô', example: 'LOT-2026-001' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  lot_number?: string;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsString()
  @IsOptional()
  notes?: string;
}

// DTO tạo phiếu xuất kho
export class CreateOutboundOrderDto {
  @ApiPropertyOptional({
    description: 'Loại phiếu xuất',
    enum: OutboundType,
    example: 'SALES_ORDER',
  })
  @IsEnum(OutboundType, {
    message:
      'Loại phiếu xuất không hợp lệ (SALES_ORDER | TRANSFER | PRODUCTION | RETURN_VENDOR | SAMPLE)',
  })
  @IsOptional()
  order_type?: OutboundType;

  @ApiPropertyOptional({
    description: 'Tên khách hàng',
    example: 'Nguyễn Văn A',
  })
  @IsString({ message: 'Tên khách hàng phải là chuỗi ký tự' })
  @IsOptional()
  @MaxLength(255)
  customer_name?: string;

  @ApiPropertyOptional({ description: 'SĐT khách', example: '0909123456' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  customer_phone?: string;

  @ApiPropertyOptional({
    description: 'Địa chỉ giao hàng',
    example: '123 Lê Lợi, Q.1, TP.HCM',
  })
  @IsString()
  @IsOptional()
  delivery_address?: string;

  @ApiPropertyOptional({
    description: 'Mã tham chiếu đơn hàng gốc',
    example: 'SO-2026-001',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  reference_code?: string;

  @ApiPropertyOptional({ description: 'Mã kho xuất', example: 'WH-HCM-01' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  warehouse_code?: string;

  @ApiPropertyOptional({
    description: 'Ngày yêu cầu giao (ISO)',
    example: '2026-03-20',
  })
  @IsDateString(
    {},
    { message: 'Ngày yêu cầu giao phải đúng định dạng ISO (YYYY-MM-DD)' },
  )
  @IsOptional()
  required_date?: string;

  @ApiPropertyOptional({
    description: 'Nhân viên phụ trách',
    example: 'EMP-001',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  assigned_to?: string;

  @ApiPropertyOptional({ description: 'Tổng trọng lượng (kg)', example: 25.5 })
  @IsNumber({}, { message: 'Tổng trọng lượng phải là số' })
  @Min(0)
  @IsOptional()
  total_weight?: number;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'ID dự án (để kiểm tra BOQ)' })
  @IsString()
  @IsOptional()
  project_id?: string;

  @ApiPropertyOptional({ description: 'ID WBS' })
  @IsString()
  @IsOptional()
  wbs_id?: string;

  @ApiPropertyOptional({ description: 'UUID loại chi phí (budget check)' })
  @IsUUID('4', { message: 'category_id phải là UUID hợp lệ' })
  @IsOptional()
  category_id?: string;

  @ApiPropertyOptional({
    description: 'Giá trị ước tính phiếu xuất (VNĐ) — dùng cho budget check',
    example: 50000000,
  })
  @IsNumber({}, { message: 'estimated_amount phải là số' })
  @Min(0)
  @IsOptional()
  estimated_amount?: number;

  @ApiProperty({
    description: 'Danh sách dòng hàng xuất',
    type: [CreateOutboundLineDto],
  })
  @IsArray({ message: 'Danh sách dòng hàng phải là mảng' })
  @ArrayNotEmpty({ message: 'Phiếu xuất phải có ít nhất 1 dòng hàng' })
  @ValidateNested({ each: true })
  @Type(() => CreateOutboundLineDto)
  lines: CreateOutboundLineDto[];
}
