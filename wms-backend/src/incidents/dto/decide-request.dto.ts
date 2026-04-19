import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DecideRequestDto {
  @ApiPropertyOptional({ description: 'Ghi chú phê duyệt/từ chối' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  decision_note?: string;
}
