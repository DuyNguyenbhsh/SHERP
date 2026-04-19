import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateMasterPlanDto {
  @ApiProperty({ example: 'MP-2026-TOWER-A' })
  @IsString()
  @IsNotEmpty()
  @Length(3, 40)
  code: string;

  @ApiProperty({ example: 'Bảo trì TOWER A năm 2026' })
  @IsString()
  @Length(3, 200)
  name: string;

  @ApiProperty({ example: 2026 })
  @IsInt()
  @Min(2020)
  @Max(2100)
  year: number;

  @ApiProperty({ example: 'a1b2c3d4-...' })
  @IsUUID()
  project_id: string;

  @ApiPropertyOptional({ example: '1250000000' })
  @IsOptional()
  @IsString()
  budget_vnd?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  end_date?: string;
}
