import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class CreateInstanceDto {
  @ApiProperty({ description: 'UUID ChecklistTemplate' })
  @IsUUID()
  template_id: string;

  @ApiProperty({ description: 'UUID Employee nhận nhiệm vụ' })
  @IsUUID()
  assignee_id: string;

  @ApiPropertyOptional({
    description: 'UUID WorkItem mà instance này thuộc về',
  })
  @IsOptional()
  @IsUUID()
  work_item_id?: string;

  @ApiPropertyOptional({ example: '2026-04-20T17:00:00+07:00' })
  @IsOptional()
  @IsDateString()
  due_date?: string;
}
