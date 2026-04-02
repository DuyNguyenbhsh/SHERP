import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsNumber,
  Min,
  IsUUID,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { LinkType } from '../enums/schedule.enum';

export class CreateTaskDto {
  @ApiProperty()
  @IsUUID('4')
  project_id: string;

  @ApiProperty({ example: 'T-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  task_code: string;

  @ApiProperty({ example: 'Đào móng' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 15 })
  @IsNumber()
  @Min(1)
  duration_days: number;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  start_date?: string;

  @ApiPropertyOptional()
  @IsUUID('4')
  @IsOptional()
  wbs_id?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  planned_labor?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  resource_notes?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  sort_order?: number;
}

export class UpdateTaskDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(1)
  @IsOptional()
  duration_days?: number;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  start_date?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  progress_percent?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  planned_labor?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  resource_notes?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateLinkDto {
  @ApiProperty()
  @IsUUID('4')
  project_id: string;

  @ApiProperty()
  @IsUUID('4')
  predecessor_id: string;

  @ApiProperty()
  @IsUUID('4')
  successor_id: string;

  @ApiPropertyOptional({ enum: LinkType })
  @IsEnum(LinkType)
  @IsOptional()
  link_type?: LinkType;

  @ApiPropertyOptional({ example: 2 })
  @IsNumber()
  @IsOptional()
  lag_days?: number;
}

export class ActionDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  comment?: string;
}
