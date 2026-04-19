import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Length,
  ValidateNested,
} from 'class-validator';

class CreateOfficeTaskItemInput {
  @ApiProperty({ example: 1 })
  display_order: number;

  @ApiProperty({ example: 'Chuẩn bị hồ sơ quyết toán Q1' })
  @IsString()
  @Length(1, 500)
  content: string;
}

export class CreateOfficeTaskDto {
  @ApiProperty({ example: 'Làm hồ sơ thuế Q1' })
  @IsString()
  @Length(3, 200)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsUUID()
  project_id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  work_item_id?: string;

  @ApiProperty({ description: 'UUID employee được giao' })
  @IsUUID()
  assignee_id: string;

  @ApiPropertyOptional({ example: '2026-04-25T17:00:00+07:00' })
  @IsOptional()
  @IsDateString()
  due_date?: string;

  @ApiPropertyOptional({ type: [CreateOfficeTaskItemInput] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateOfficeTaskItemInput)
  items?: CreateOfficeTaskItemInput[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl({}, { each: true })
  attachments?: string[];
}
