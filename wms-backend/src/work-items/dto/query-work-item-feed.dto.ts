import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { WorkItemStatus, WorkItemType } from '../enums/work-item.enum';

export class QueryWorkItemFeedDto {
  @ApiPropertyOptional({ enum: WorkItemType, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(WorkItemType, { each: true })
  types?: WorkItemType[];

  @ApiPropertyOptional({ enum: WorkItemStatus, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(WorkItemStatus, { each: true })
  statuses?: WorkItemStatus[];

  @ApiPropertyOptional({
    description: 'UUID assignee; bỏ trống = xem tất cả theo quyền',
  })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({
    description: 'Chỉ lấy công việc của tôi',
    default: true,
  })
  @IsOptional()
  onlyMine?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  cursor?: string;
}
