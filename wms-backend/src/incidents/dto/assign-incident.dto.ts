import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class AssignIncidentDto {
  @ApiProperty({ description: 'UUID employee nhận sự cố' })
  @IsUUID()
  assigned_to: string;

  @ApiPropertyOptional({ example: '2026-04-22T17:00:00+07:00' })
  @IsOptional()
  @IsDateString()
  due_date?: string;

  @ApiPropertyOptional({
    example: 48,
    description: 'Nếu không truyền due_date, tính từ SLA giờ',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(720)
  sla_hours?: number;
}
