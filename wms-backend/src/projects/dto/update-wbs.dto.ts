import { PartialType } from '@nestjs/swagger';
import { CreateWbsDto } from './create-wbs.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min, Max } from 'class-validator';

export class UpdateWbsDto extends PartialType(CreateWbsDto) {
  @ApiPropertyOptional({ description: '% hoàn thành (0-100)', example: 65 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progress_percent?: number;
}
