import {
  IsUUID,
  IsArray,
  IsOptional,
  ValidateNested,
  IsNumber,
  IsInt,
  Min,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePoLineDto {
  @ApiProperty({
    description: 'UUID sản phẩm',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'product_id phải là UUID hợp lệ' })
  product_id: string;

  @ApiProperty({ description: 'Số lượng đặt', example: 100 })
  @IsInt({ message: 'Số lượng đặt phải là số nguyên' })
  @Min(1, { message: 'Số lượng đặt phải lớn hơn 0' })
  order_qty: number;

  @ApiProperty({ description: 'Đơn giá', example: 150000 })
  @IsNumber({}, { message: 'Đơn giá phải là số' })
  @Min(0, { message: 'Đơn giá không được âm' })
  unit_price: number;
}

export class CreatePoDto {
  @ApiProperty({ description: 'UUID nhà cung cấp' })
  @IsUUID('4', { message: 'vendor_id phải là UUID hợp lệ' })
  vendor_id: string;

  @ApiPropertyOptional({ description: 'UUID dự án (budget control)' })
  @IsUUID('4', { message: 'project_id phải là UUID hợp lệ' })
  @IsOptional()
  project_id?: string;

  @ApiPropertyOptional({ description: 'UUID loại chi phí (budget control)' })
  @IsUUID('4', { message: 'category_id phải là UUID hợp lệ' })
  @IsOptional()
  category_id?: string;

  @ApiProperty({ description: 'Danh sách dòng hàng', type: [CreatePoLineDto] })
  @IsArray({ message: 'Danh sách dòng hàng phải là mảng' })
  @ArrayNotEmpty({ message: 'PO phải có ít nhất 1 dòng hàng' })
  @ValidateNested({ each: true })
  @Type(() => CreatePoLineDto)
  lines: CreatePoLineDto[];
}
