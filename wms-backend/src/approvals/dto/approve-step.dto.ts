import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ApproveStepDto {
  @ApiPropertyOptional({ description: 'Nhận xét khi phê duyệt' })
  @IsOptional()
  @IsString()
  comment?: string;
}
