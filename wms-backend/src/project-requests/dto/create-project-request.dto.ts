import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsNumber,
  Min,
  IsUUID,
} from 'class-validator';

export class CreateProjectRequestDto {
  @ApiProperty({
    description: 'Tiêu đề tờ trình',
    example: 'Đề xuất dự án Khu đô thị SH Central',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ description: 'Nội dung tờ trình chi tiết' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Mã dự án đề xuất', example: 'PRJ-025' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  proposed_project_code: string;

  @ApiProperty({
    description: 'Tên dự án đề xuất',
    example: 'Khu đô thị SH Central',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  proposed_project_name: string;

  @ApiPropertyOptional({ description: 'Địa điểm dự án' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({ description: 'GFA (m²)', example: 15000 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  gfa_m2?: number;

  @ApiPropertyOptional({ description: 'Ngân sách (VNĐ)', example: 50000000000 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  budget?: number;

  @ApiPropertyOptional({ description: 'UUID Chủ đầu tư' })
  @IsUUID('4')
  @IsOptional()
  investor_id?: string;

  @ApiPropertyOptional({ description: 'UUID Giám đốc dự án' })
  @IsUUID('4')
  @IsOptional()
  manager_id?: string;

  @ApiPropertyOptional({ description: 'UUID Phòng ban quản lý' })
  @IsUUID('4')
  @IsOptional()
  department_id?: string;

  @ApiPropertyOptional({
    description: 'Giai đoạn đề xuất',
    example: 'PLANNING',
  })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  proposed_stage?: string;
}
