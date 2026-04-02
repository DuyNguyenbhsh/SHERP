import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpsertCbsDto {
  @ApiProperty({ description: 'ID WBS node' })
  @IsUUID()
  @IsNotEmpty()
  wbs_id: string;

  @ApiProperty({ description: 'ID loại chi phí' })
  @IsUUID()
  @IsNotEmpty()
  category_id: string;

  @ApiProperty({ description: 'Ngân sách phân bổ', example: 500000000 })
  @IsNumber()
  @Min(0)
  planned_amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
