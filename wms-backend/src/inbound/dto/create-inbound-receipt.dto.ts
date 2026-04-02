import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsArray,
  IsInt,
  Min,
  MaxLength,
  ArrayNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InboundType } from '../enums/inbound.enum';

// DTO cho từng dòng hàng nhận
export class CreateInboundLineDto {
  @ApiProperty({
    description: 'UUID sản phẩm',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'product_id phải là UUID hợp lệ' })
  product_id: string;

  @ApiProperty({ description: 'Số lượng kỳ vọng nhận', example: 100 })
  @IsInt({ message: 'Số lượng kỳ vọng phải là số nguyên' })
  @Min(1, { message: 'Số lượng kỳ vọng phải lớn hơn 0' })
  expected_qty: number;

  @ApiPropertyOptional({ description: 'Số lượng nhận thực tế', example: 95 })
  @IsInt({ message: 'Số lượng nhận thực tế phải là số nguyên' })
  @Min(0, { message: 'Số lượng nhận không được âm' })
  @IsOptional()
  received_qty?: number;

  @ApiPropertyOptional({ description: 'Số lô hàng', example: 'LOT-2026-001' })
  @IsString({ message: 'Số lô phải là chuỗi ký tự' })
  @IsOptional()
  @MaxLength(100, { message: 'Số lô tối đa 100 ký tự' })
  lot_number?: string;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsString({ message: 'Ghi chú phải là chuỗi ký tự' })
  @IsOptional()
  notes?: string;
}

// DTO tạo Phiếu nhập kho
export class CreateInboundReceiptDto {
  @ApiPropertyOptional({
    description: 'Loại phiếu nhập',
    enum: InboundType,
    example: 'PO_RECEIPT',
  })
  @IsEnum(InboundType, {
    message:
      'Loại nhập kho không hợp lệ (PO_RECEIPT | RETURN | TRANSFER | ADJUSTMENT)',
  })
  @IsOptional()
  receipt_type?: InboundType;

  @ApiPropertyOptional({ description: 'UUID Purchase Order liên kết' })
  @IsUUID('4', { message: 'po_id phải là UUID hợp lệ' })
  @IsOptional()
  po_id?: string;

  @ApiPropertyOptional({ description: 'UUID Goods Receipt Note liên kết' })
  @IsUUID('4', { message: 'grn_id phải là UUID hợp lệ' })
  @IsOptional()
  grn_id?: string;

  @ApiPropertyOptional({
    description: 'Mã kho nhận hàng',
    example: 'WH-HCM-01',
  })
  @IsString({ message: 'Mã kho phải là chuỗi ký tự' })
  @IsOptional()
  @MaxLength(50, { message: 'Mã kho tối đa 50 ký tự' })
  warehouse_code?: string;

  @ApiPropertyOptional({
    description: 'Cửa nhận hàng (Dock)',
    example: 'DOCK-A1',
  })
  @IsString({ message: 'Cửa nhận hàng phải là chuỗi ký tự' })
  @IsOptional()
  @MaxLength(50, { message: 'Cửa nhận hàng tối đa 50 ký tự' })
  dock_number?: string;

  @ApiProperty({
    description: 'Mã nhân viên kho nhận hàng',
    example: 'EMP-001',
  })
  @IsString({ message: 'Mã nhân viên nhận hàng phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Phải cung cấp mã nhân viên kho nhận hàng' })
  @MaxLength(100)
  received_by: string;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsString({ message: 'Ghi chú phải là chuỗi ký tự' })
  @IsOptional()
  notes?: string;

  @ApiProperty({
    description: 'Danh sách dòng hàng nhận',
    type: [CreateInboundLineDto],
  })
  @IsArray({ message: 'Danh sách dòng hàng phải là mảng' })
  @ArrayNotEmpty({ message: 'Phiếu nhập phải có ít nhất 1 dòng hàng' })
  @ValidateNested({ each: true })
  @Type(() => CreateInboundLineDto)
  lines: CreateInboundLineDto[];
}
