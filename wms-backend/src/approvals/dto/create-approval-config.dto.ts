import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsArray,
  ValidateNested,
  IsInt,
  IsBoolean,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ApprovalConfigStepDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  step_order: number;

  @ApiPropertyOptional({ example: 'CHT' })
  @IsOptional()
  @IsString()
  approver_role?: string;

  @ApiPropertyOptional({ description: 'UUID nguoi phe duyet cu the' })
  @IsOptional()
  @IsString()
  approver_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_required?: boolean;

  @ApiPropertyOptional({
    description: 'Bat buoc (true) hay co the bo qua (false)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  is_mandatory?: boolean;

  @ApiPropertyOptional({
    description: 'So nguoi can duyet o buoc nay (>1 = song song)',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  required_count?: number;

  @ApiPropertyOptional({ description: 'UUID nguoi duyet thay khi chinh vang' })
  @IsOptional()
  @IsString()
  delegate_to_id?: string;

  @ApiPropertyOptional({
    description: 'UUID cap pho - tu dong nhan quyen sau timeout_hours',
  })
  @IsOptional()
  @IsString()
  alternative_approver_id?: string;

  @ApiPropertyOptional({
    example: 72,
    description: 'Sau N gio, quyen duyet chuyen sang alternative_approver',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  timeout_hours?: number;
}

export class CreateApprovalConfigDto {
  @ApiProperty({ example: 'PROJECT_BUDGET' })
  @IsString()
  @IsNotEmpty()
  entity_type: string;

  @ApiProperty({ example: 'Phe duyet ngan sach du an' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Mo ta quy trinh' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Module: PROCUREMENT, PROJECT, WMS...' })
  @IsOptional()
  @IsString()
  module_code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  organization_id?: string;

  @ApiPropertyOptional({
    description: 'Dieu kien kich hoat va nguong tien',
    example: {
      threshold_rules: [
        { max_amount: 5000000, skip_to_step: 999 },
        { max_amount: 50000000, max_step: 2 },
        { max_amount: null, max_step: 999 },
      ],
    },
  })
  @IsOptional()
  conditions?: Record<string, unknown>;

  @ApiProperty({ type: [ApprovalConfigStepDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApprovalConfigStepDto)
  steps: ApprovalConfigStepDto[];
}
