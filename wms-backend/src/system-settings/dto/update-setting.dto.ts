import { IsString, IsOptional, MaxLength, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSettingDto {
  @ApiProperty({ description: 'Giá trị cài đặt', example: 'SH Group' })
  @IsString({ message: 'Giá trị phải là chuỗi ký tự' })
  setting_value: string;

  @ApiPropertyOptional({ description: 'Mô tả', example: 'Tên công ty' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  description?: string;
}

export class CreateSettingDto {
  @ApiProperty({ description: 'Key cài đặt', example: 'COMPANY_NAME' })
  @IsString()
  @MaxLength(100)
  setting_key: string;

  @ApiProperty({ description: 'Giá trị', example: 'SH Group' })
  @IsString()
  setting_value: string;

  @ApiPropertyOptional({ description: 'Kiểu dữ liệu', example: 'STRING' })
  @IsString()
  @IsOptional()
  @IsIn(['STRING', 'NUMBER', 'BOOLEAN', 'JSON'])
  value_type?: string;

  @ApiPropertyOptional({ description: 'Mô tả' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  description?: string;

  @ApiPropertyOptional({ description: 'Phân loại', example: 'GENERAL' })
  @IsString()
  @IsOptional()
  @IsIn(['GENERAL', 'FINANCE', 'HR', 'SYSTEM'])
  category?: string;
}
