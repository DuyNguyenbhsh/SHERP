import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateInspectionDto {
  @ApiProperty()
  @IsUUID()
  project_id: string;

  @ApiPropertyOptional({ description: 'UUID WorkItem parent nếu có' })
  @IsOptional()
  @IsUUID()
  work_item_id?: string;

  @ApiProperty({ description: 'UUID employee nhận nhiệm vụ' })
  @IsUUID()
  assignee_id: string;

  @ApiProperty({ example: '2026-04-20', description: 'Ngày đọc đồng hồ' })
  @IsDateString()
  inspection_date: string;

  @ApiPropertyOptional({ example: '2026-04-20T18:00:00+07:00' })
  @IsOptional()
  @IsDateString()
  due_date?: string;

  @ApiProperty({
    type: [String],
    description:
      'Danh sách UUID EnergyMeter cần đọc — BR-EI-03: complete khi đủ',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  required_meter_ids: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
