import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsNumber,
  IsArray,
  ArrayMinSize,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// DTO tạo Vận đơn (Waybill) — gom nhiều OutboundOrder vào 1 chuyến xe
export class CreateWaybillDto {
  @ApiPropertyOptional({
    description: 'Mã vận đơn (tự sinh nếu bỏ trống)',
    example: 'WB-260314-001',
  })
  @IsString({ message: 'Mã vận đơn phải là chuỗi ký tự' })
  @IsOptional()
  @MaxLength(100, { message: 'Mã vận đơn tối đa 100 ký tự' })
  waybill_code?: string; // Nếu không nhập → tự sinh

  @ApiProperty({
    description: 'Danh sách UUID phiếu xuất kho',
    example: ['550e8400-e29b-41d4-a716-446655440000'],
  })
  @IsArray({ message: 'Danh sách phiếu xuất phải là mảng' })
  @ArrayMinSize(1, { message: 'Phải chọn ít nhất 1 phiếu xuất kho' })
  @IsUUID('4', { each: true, message: 'Mỗi phần tử phải là UUID hợp lệ' })
  outbound_order_ids: string[];

  @ApiPropertyOptional({ description: 'UUID xe vận chuyển' })
  @IsUUID('4', { message: 'vehicle_id phải là UUID hợp lệ' })
  @IsOptional()
  vehicle_id?: string;

  @ApiPropertyOptional({ description: 'Tiền thu hộ (COD)', example: 1500000 })
  @IsNumber({}, { message: 'Tiền thu hộ (COD) phải là số' })
  @Min(0, { message: 'Tiền thu hộ không được âm' })
  @IsOptional()
  cod_amount?: number;

  @ApiPropertyOptional({ description: 'Tổng khối lượng (gram)', example: 5000 })
  @IsNumber({}, { message: 'Khối lượng phải là số' })
  @Min(0, { message: 'Khối lượng không được âm' })
  @IsOptional()
  weight?: number;

  @ApiPropertyOptional({ description: 'Phí vận chuyển', example: 50000 })
  @IsNumber({}, { message: 'Phí ship phải là số' })
  @Min(0, { message: 'Phí ship không được âm' })
  @IsOptional()
  shipping_fee?: number;

  @ApiPropertyOptional({ description: 'Mã nhà vận chuyển ngoài' })
  @IsString({ message: 'provider_id phải là chuỗi ký tự' })
  @IsOptional()
  provider_id?: string;

  @ApiPropertyOptional({
    description: 'Tên tài xế nội bộ',
    example: 'Nguyễn Văn B',
  })
  @IsString({ message: 'Tên tài xế phải là chuỗi ký tự' })
  @IsOptional()
  @MaxLength(100)
  driver_name?: string;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsString({ message: 'Ghi chú phải là chuỗi ký tự' })
  @IsOptional()
  notes?: string;
}
