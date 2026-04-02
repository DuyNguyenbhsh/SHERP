import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsNumber,
} from 'class-validator';

export class CreateWbsDto {
  @ApiProperty({ description: 'Mã WBS phân cấp', example: '1.2.1' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'Tên hạng mục WBS', example: 'Thi công móng' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'ID WBS cha (null = root)' })
  @IsOptional()
  @IsUUID()
  parent_id?: string;

  @ApiPropertyOptional({ description: 'Phòng ban chịu trách nhiệm' })
  @IsOptional()
  @IsUUID()
  department_id?: string;

  @ApiPropertyOptional({ description: 'Trọng số EV (0-100)', example: 25 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  weight?: number;

  @ApiPropertyOptional({ description: 'Thứ tự hiển thị', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  planned_start?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  planned_end?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
