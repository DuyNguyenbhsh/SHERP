import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StockStatus } from '../enums/inventory.enum';

// DTO tra cứu tồn kho (query params)
export class QueryInventoryDto {
  @ApiPropertyOptional({ description: 'Lọc theo UUID sản phẩm' })
  @IsUUID('4', { message: 'product_id phải là UUID hợp lệ' })
  @IsOptional()
  product_id?: string;

  @ApiPropertyOptional({ description: 'Lọc theo UUID vị trí' })
  @IsUUID('4', { message: 'location_id phải là UUID hợp lệ' })
  @IsOptional()
  location_id?: string;

  @ApiPropertyOptional({ description: 'Lọc theo mã kho' })
  @IsString()
  @IsOptional()
  warehouse_code?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái tồn kho',
    enum: StockStatus,
  })
  @IsEnum(StockStatus, { message: 'Trạng thái tồn kho không hợp lệ' })
  @IsOptional()
  status?: StockStatus;
}

// DTO điều chỉnh tồn kho (kiểm kê, nhập/xuất thủ công)
export class AdjustInventoryDto {
  @ApiProperty({
    description: 'UUID sản phẩm',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'product_id phải là UUID hợp lệ' })
  product_id: string;

  @ApiProperty({
    description: 'UUID vị trí kệ',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID('4', { message: 'location_id phải là UUID hợp lệ' })
  location_id: string;

  @ApiProperty({
    description: 'Số lượng điều chỉnh (dương = tăng, âm = giảm)',
    example: -5,
  })
  @IsInt({ message: 'Số lượng điều chỉnh phải là số nguyên' })
  @IsNotEmpty({ message: 'Số lượng điều chỉnh không được để trống' })
  adjustment_qty: number; // Số dương = tăng, số âm = giảm

  @ApiProperty({
    description: 'Lý do điều chỉnh',
    example: 'Kiểm kê phát hiện thiếu 5 đơn vị',
  })
  @IsString({ message: 'Lý do điều chỉnh phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Phải nhập lý do điều chỉnh' })
  @MaxLength(500, { message: 'Lý do điều chỉnh tối đa 500 ký tự' })
  reason: string;

  @ApiPropertyOptional({ description: 'Số lô', example: 'LOT-2026-001' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  lot_number?: string;

  @ApiPropertyOptional({ description: 'Số serial' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  serial_number?: string;
}

// DTO chuyển kho nội bộ (Transfer)
export class TransferInventoryDto {
  @ApiProperty({ description: 'UUID sản phẩm' })
  @IsUUID('4', { message: 'product_id phải là UUID hợp lệ' })
  product_id: string;

  @ApiProperty({ description: 'UUID vị trí nguồn' })
  @IsUUID('4', { message: 'from_location_id phải là UUID hợp lệ' })
  from_location_id: string;

  @ApiProperty({ description: 'UUID vị trí đích' })
  @IsUUID('4', { message: 'to_location_id phải là UUID hợp lệ' })
  to_location_id: string;

  @ApiProperty({ description: 'Số lượng chuyển', example: 10 })
  @IsInt({ message: 'Số lượng chuyển phải là số nguyên' })
  @Min(1, { message: 'Số lượng chuyển phải lớn hơn 0' })
  qty: number;

  @ApiPropertyOptional({ description: 'Số lô' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  lot_number?: string;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsString({ message: 'Ghi chú phải là chuỗi ký tự' })
  @IsOptional()
  notes?: string;
}
