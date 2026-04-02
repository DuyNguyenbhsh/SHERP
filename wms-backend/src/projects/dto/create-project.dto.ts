import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { ProjectStage, ProjectStatus } from '../enums/project.enum';

export class CreateProjectDto {
  @ApiProperty({ description: 'Mã dự án', example: 'PRJ-001' })
  @IsString({ message: 'Mã dự án phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mã dự án không được để trống' })
  @MaxLength(50, { message: 'Mã dự án tối đa 50 ký tự' })
  project_code: string;

  @ApiProperty({ description: 'Tên dự án', example: 'Khu đô thị SH Central' })
  @IsString({ message: 'Tên dự án phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên dự án không được để trống' })
  @MaxLength(255, { message: 'Tên dự án tối đa 255 ký tự' })
  project_name: string;

  @ApiPropertyOptional({ description: 'Mô tả dự án' })
  @IsString({ message: 'Mô tả phải là chuỗi ký tự' })
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'UUID tổ chức quản lý' })
  @IsUUID('4', { message: 'organization_id phải là UUID hợp lệ' })
  @IsOptional()
  organization_id?: string;

  @ApiPropertyOptional({ description: 'Giai đoạn IMPC', enum: ProjectStage })
  @IsEnum(ProjectStage, { message: 'Giai đoạn không hợp lệ' })
  @IsOptional()
  stage?: ProjectStage;

  @ApiPropertyOptional({ description: 'Trạng thái dự án', enum: ProjectStatus })
  @IsEnum(ProjectStatus, { message: 'Trạng thái không hợp lệ' })
  @IsOptional()
  status?: ProjectStatus;

  @ApiPropertyOptional({ description: 'Địa điểm dự án' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({
    description: 'Tổng diện tích sàn (m²)',
    example: 15000.5,
  })
  @IsNumber({}, { message: 'GFA phải là số' })
  @Min(0, { message: 'GFA không được âm' })
  @IsOptional()
  gfa_m2?: number;

  @ApiPropertyOptional({ description: 'UUID Chủ đầu tư (Supplier/Partner)' })
  @IsUUID('4', { message: 'investor_id phải là UUID hợp lệ' })
  @IsOptional()
  investor_id?: string;

  @ApiPropertyOptional({ description: 'UUID Giám đốc dự án (Employee)' })
  @IsUUID('4', { message: 'manager_id phải là UUID hợp lệ' })
  @IsOptional()
  manager_id?: string;

  @ApiPropertyOptional({ description: 'UUID Phòng ban quản lý (Organization)' })
  @IsUUID('4', { message: 'department_id phải là UUID hợp lệ' })
  @IsOptional()
  department_id?: string;

  @ApiPropertyOptional({ description: 'Ngân sách (VNĐ)', example: 50000000000 })
  @IsNumber({}, { message: 'Ngân sách phải là số' })
  @Min(0, { message: 'Ngân sách không được âm' })
  @IsOptional()
  budget?: number;
}
