import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';
import { WorkItemType } from '../../work-items/enums/work-item.enum';

export class CreateTaskTemplateDto {
  @ApiProperty({ example: 'Kiểm tra PCCC hàng tuần' })
  @IsString()
  @IsNotEmpty()
  @Length(3, 200)
  name: string;

  @ApiProperty({ enum: WorkItemType })
  @IsEnum(WorkItemType)
  work_item_type: WorkItemType;

  @ApiProperty({
    description: 'RFC 5545 RRULE',
    example: 'FREQ=WEEKLY;BYDAY=MO;BYHOUR=7',
  })
  @IsString()
  @Length(5, 200)
  recurrence_rule: string;

  @ApiProperty({ example: 24, description: 'SLA tính từ scheduled_date (giờ)' })
  @IsInt()
  @Min(1)
  @Max(720)
  sla_hours: number;

  @ApiPropertyOptional({
    description: 'UUID tới template cụ thể trong module con',
  })
  @IsOptional()
  @IsUUID()
  template_ref_id?: string;

  @ApiPropertyOptional({ example: 'TECHNICIAN' })
  @IsOptional()
  @IsString()
  @Length(2, 40)
  default_assignee_role?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
