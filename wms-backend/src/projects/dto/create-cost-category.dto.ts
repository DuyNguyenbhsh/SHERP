import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateCostCategoryDto {
  @ApiProperty({ description: 'Mã loại chi phí', example: 'MAT' })
  @IsString()
  @IsNotEmpty({ message: 'Mã không được để trống' })
  @MaxLength(20)
  code: string;

  @ApiProperty({ description: 'Tên loại chi phí', example: 'Nguyên vật liệu' })
  @IsString()
  @IsNotEmpty({ message: 'Tên không được để trống' })
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Mô tả' })
  @IsString()
  @IsOptional()
  description?: string;
}
