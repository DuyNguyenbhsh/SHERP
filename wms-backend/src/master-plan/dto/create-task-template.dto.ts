import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { WorkItemType } from '../../work-items/enums/work-item.enum';
import { ExecutorParty } from '../../facility-catalog/enums/executor-party.enum';
import { FREQ_CODES } from '../../facility-catalog/enums/freq-code.enum';

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

  @ApiProperty({ example: 24, description: 'SLA tính từ scheduled_at (giờ)' })
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

  // ── Supplement 2026-04-20 (US-MP-10→14) ────────────────────
  @ApiPropertyOptional({
    description: 'Tên task tiếng Anh (BR-MP-12: null fallback về name VI)',
    example: 'Weekly Fire Protection Check',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  name_en?: string;

  @ApiPropertyOptional({ description: 'UUID FacilitySystem (US-MP-10)' })
  @IsOptional()
  @IsUUID()
  system_id?: string;

  @ApiPropertyOptional({ description: 'UUID FacilityEquipmentItem (US-MP-10)' })
  @IsOptional()
  @IsUUID()
  equipment_item_id?: string;

  @ApiProperty({
    enum: ExecutorParty,
    default: ExecutorParty.INTERNAL,
    description: 'BR-MP-08: bắt buộc — bên thực hiện',
  })
  @IsEnum(ExecutorParty)
  executor_party: ExecutorParty;

  @ApiPropertyOptional({
    description: 'BR-MP-09: bắt buộc khi executor_party IN (CONTRACTOR, MIXED)',
  })
  @ValidateIf((o) =>
    [ExecutorParty.CONTRACTOR, ExecutorParty.MIXED].includes(o.executor_party),
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  contractor_name?: string;

  @ApiPropertyOptional({
    enum: FREQ_CODES,
    description: 'Mã tắt tần suất — render Annual Grid nhanh (BA §10.5)',
  })
  @IsOptional()
  @IsIn(FREQ_CODES as unknown as string[])
  freq_code?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'BR-MP-11: tham chiếu quy chuẩn (QCVN, TT, TCVN)',
    example: ['QCVN 02:2020/BCA', 'TT 17/2021/TT-BCA'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  regulatory_refs?: string[];

  @ApiPropertyOptional({
    default: false,
    description: 'BR-MP-10: cho phép ad-hoc trigger qua Incident escalation',
  })
  @IsOptional()
  @IsBoolean()
  allow_adhoc_trigger?: boolean;
}
