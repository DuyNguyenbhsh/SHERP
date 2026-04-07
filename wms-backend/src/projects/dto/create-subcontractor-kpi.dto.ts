import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class KpiCriterionDto {
  @ApiProperty({ example: 'Chat luong thi cong' })
  @IsString()
  name: string;

  @ApiProperty({ example: 30 })
  @IsNumber()
  @Min(0)
  @Max(100)
  weight: number;

  @ApiProperty({ example: 25 })
  @IsNumber()
  @Min(0)
  score: number;

  @ApiProperty({ example: 30 })
  @IsNumber()
  @Min(0)
  max_score: number;
}

export class CreateSubcontractorKpiDto {
  @ApiPropertyOptional({ description: 'UUID du an (neu danh gia theo du an)' })
  @IsOptional()
  @IsUUID()
  project_id?: string;

  @ApiPropertyOptional({ description: 'Ky danh gia', example: '2026-H1' })
  @IsOptional()
  @IsString()
  evaluation_period?: string;

  @ApiProperty({ description: 'Ngay danh gia', example: '2026-04-06' })
  @IsDateString()
  evaluation_date: string;

  @ApiProperty({ description: 'Cac chi tieu KPI', type: [KpiCriterionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KpiCriterionDto)
  criteria: KpiCriterionDto[];

  @ApiPropertyOptional({ description: 'Ghi chu' })
  @IsOptional()
  @IsString()
  notes?: string;
}
