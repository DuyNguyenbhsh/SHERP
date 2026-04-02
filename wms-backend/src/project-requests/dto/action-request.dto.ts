import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class ActionRequestDto {
  @ApiPropertyOptional({ description: 'Ghi chú / Lý do' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  comment?: string;
}
