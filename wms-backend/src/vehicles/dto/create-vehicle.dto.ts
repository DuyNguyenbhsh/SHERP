import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVehicleDto {
  @ApiProperty({ description: 'Mã xe', example: '51C66611' })
  @IsString({ message: 'Mã xe phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mã xe không được để trống' })
  @MaxLength(50, { message: 'Mã xe tối đa 50 ký tự' })
  code: string;

  @ApiPropertyOptional({ description: 'Biển số xe', example: '51C-666.11' })
  @IsString({ message: 'Biển số phải là chuỗi ký tự' })
  @IsOptional()
  @MaxLength(20, { message: 'Biển số tối đa 20 ký tự' })
  licensePlate?: string;

  @ApiProperty({ description: 'Tên tài xế/Xe', example: 'Nguyễn Văn A' })
  @IsString({ message: 'Tên tài xế phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên tài xế/Xe không được để trống' })
  @MaxLength(100, { message: 'Tên tài xế tối đa 100 ký tự' })
  driverName: string;

  @ApiPropertyOptional({ description: 'Hãng xe', example: 'Isuzu' })
  @IsString({ message: 'Hãng xe phải là chuỗi ký tự' })
  @IsOptional()
  @MaxLength(100, { message: 'Hãng xe tối đa 100 ký tự' })
  brand?: string;

  @ApiPropertyOptional({ description: 'Mô tả' })
  @IsString({ message: 'Mô tả phải là chuỗi ký tự' })
  @IsOptional()
  @MaxLength(500, { message: 'Mô tả tối đa 500 ký tự' })
  description?: string;
}
