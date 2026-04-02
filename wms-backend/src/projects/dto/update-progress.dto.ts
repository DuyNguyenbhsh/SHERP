import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min, Max } from 'class-validator';

export class UpdateProgressDto {
  @ApiProperty({ description: '% hoàn thành (0-100)', example: 75 })
  @IsNumber()
  @Min(0)
  @Max(100)
  progress_percent: number;
}
