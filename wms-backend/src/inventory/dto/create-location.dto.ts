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
import { LocationType } from '../enums/inventory.enum';

export class CreateLocationDto {
  @ApiProperty({ description: 'Mã vị trí', example: 'BIN-A1-01' })
  @IsString({ message: 'Mã vị trí phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mã vị trí không được để trống' })
  @MaxLength(50, { message: 'Mã vị trí tối đa 50 ký tự' })
  code: string;

  @ApiProperty({ description: 'Tên vị trí', example: 'Kệ A1 - Ngăn 01' })
  @IsString({ message: 'Tên vị trí phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên vị trí không được để trống' })
  @MaxLength(255, { message: 'Tên vị trí tối đa 255 ký tự' })
  name: string;

  @ApiPropertyOptional({ description: 'Mã vạch', example: 'LOC-A1-01-BC' })
  @IsString({ message: 'Mã vạch phải là chuỗi ký tự' })
  @IsOptional()
  @MaxLength(100, { message: 'Mã vạch tối đa 100 ký tự' })
  barcode?: string;

  @ApiPropertyOptional({
    description: 'Loại vị trí',
    enum: LocationType,
    example: 'BIN',
  })
  @IsEnum(LocationType, {
    message:
      'Loại vị trí không hợp lệ (WAREHOUSE | ZONE | AISLE | BIN | STAGING | QC_AREA)',
  })
  @IsOptional()
  location_type?: LocationType;

  @ApiPropertyOptional({ description: 'UUID vị trí cha (cây phân cấp)' })
  @IsUUID('4', { message: 'parent_id phải là UUID hợp lệ' })
  @IsOptional()
  parent_id?: string;

  @ApiPropertyOptional({ description: 'Sức chứa tối đa', example: 500 })
  @IsInt({ message: 'Sức chứa tối đa phải là số nguyên' })
  @Min(0, { message: 'Sức chứa không được âm' })
  @IsOptional()
  max_capacity?: number;

  @ApiPropertyOptional({ description: 'Mã kho', example: 'WH-HCM-01' })
  @IsString({ message: 'Mã kho phải là chuỗi ký tự' })
  @IsOptional()
  @MaxLength(50)
  warehouse_code?: string;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsString({ message: 'Ghi chú phải là chuỗi ký tự' })
  @IsOptional()
  notes?: string;
}

export class UpdateLocationDto extends CreateLocationDto {
  @ApiPropertyOptional({
    description: 'Trạng thái vị trí',
    enum: ['ACTIVE', 'FULL', 'BLOCKED', 'INACTIVE'],
    example: 'ACTIVE',
  })
  @IsEnum(['ACTIVE', 'FULL', 'BLOCKED', 'INACTIVE'], {
    message: 'Trạng thái không hợp lệ',
  })
  @IsOptional()
  status?: string;
}
