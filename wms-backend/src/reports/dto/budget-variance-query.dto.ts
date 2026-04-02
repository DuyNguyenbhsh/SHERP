import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class BudgetVarianceQueryDto {
  @ApiPropertyOptional({
    description: 'Lọc theo ID dự án',
    example: 'uuid-here',
  })
  @IsOptional()
  @IsUUID()
  project_id?: string;

  @ApiPropertyOptional({ description: 'Lọc theo năm báo cáo', example: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;
}
