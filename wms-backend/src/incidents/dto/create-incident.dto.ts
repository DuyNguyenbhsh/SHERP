import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Length,
  MinLength,
} from 'class-validator';
import { IncidentCategory, IncidentSeverity } from '../enums/incident.enum';

export class CreateIncidentDto {
  @ApiProperty({ example: 'Quạt thông gió tầng hầm 1 ngừng hoạt động' })
  @IsString()
  @Length(3, 200)
  title: string;

  // BR-INC-01: mô tả ≥ 20 ký tự
  @ApiProperty({
    description: 'Mô tả chi tiết — tối thiểu 20 ký tự (BR-INC-01)',
  })
  @IsString()
  @MinLength(20, { message: 'BR-INC-01: Mô tả phải có ít nhất 20 ký tự' })
  description: string;

  @ApiProperty()
  @IsUUID()
  project_id: string;

  @ApiPropertyOptional({ description: 'Link tới WorkItem parent nếu có' })
  @IsOptional()
  @IsUUID()
  work_item_id?: string;

  @ApiProperty({ enum: IncidentSeverity })
  @IsEnum(IncidentSeverity)
  severity: IncidentSeverity;

  @ApiProperty({ enum: IncidentCategory })
  @IsEnum(IncidentCategory)
  category: IncidentCategory;

  @ApiPropertyOptional({ example: 'Toà A, tầng B1' })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  location_text?: string;

  @ApiPropertyOptional({ example: 'FAN-B1-03' })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  related_asset?: string;

  // BR-INC-01: bắt buộc ≥ 1 ảnh evidence khi tạo
  @ApiProperty({
    type: [String],
    description: 'Secure URL từ Cloudinary. Tối thiểu 1, tối đa 10 (BR-INC-01)',
  })
  @IsArray()
  @ArrayMinSize(1, {
    message: 'BR-INC-01: Cần ít nhất 1 ảnh bằng chứng khi tạo sự cố',
  })
  @ArrayMaxSize(10)
  @IsUrl({}, { each: true })
  @IsNotEmpty({ each: true })
  photos: string[];
}
