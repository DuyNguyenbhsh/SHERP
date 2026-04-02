import {
  IsUUID,
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ReceiveGoodsLineDto {
  @ApiProperty({ description: 'UUID dòng PO' })
  @IsUUID('4', { message: 'po_line_id phải là UUID hợp lệ' })
  po_line_id: string;

  @ApiProperty({ description: 'Số lượng nhận', example: 100 })
  @IsInt({ message: 'Số lượng nhận phải là số nguyên' })
  @Min(1, { message: 'Số lượng nhận phải lớn hơn 0' })
  received_qty: number;

  // Mảng chuỗi Serial (có thể rỗng nếu mặt hàng không bật is_serial_tracking)
  @ApiProperty({
    description: 'Danh sách Serial Number',
    example: ['SN-001', 'SN-002'],
  })
  @IsArray({ message: 'serial_numbers phải là mảng' })
  @IsString({ each: true, message: 'Mỗi Serial Number phải là chuỗi ký tự' })
  serial_numbers: string[];
}

export class ReceiveGoodsDto {
  @ApiProperty({ description: 'UUID Purchase Order' })
  @IsUUID('4', { message: 'po_id phải là UUID hợp lệ' })
  po_id: string;

  @ApiProperty({ description: 'Mã nhân viên nhận hàng', example: 'EMP-001' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng cung cấp mã nhân viên kho nhận hàng' })
  received_by: string;

  @ApiProperty({
    description: 'Danh sách dòng nhận',
    type: [ReceiveGoodsLineDto],
  })
  @IsArray({ message: 'Danh sách dòng nhận phải là mảng' })
  @ArrayNotEmpty({ message: 'Phải có ít nhất 1 dòng hàng nhận' })
  @ValidateNested({ each: true })
  @Type(() => ReceiveGoodsLineDto)
  lines: ReceiveGoodsLineDto[];
}
