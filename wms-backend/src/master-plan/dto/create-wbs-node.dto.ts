import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { WbsNodeType } from '../enums/master-plan.enum';

export class CreateWbsNodeDto {
  @ApiPropertyOptional({ example: 'UUID node cha (null = root)' })
  @IsOptional()
  @IsUUID()
  parent_id?: string;

  @ApiProperty({ example: '1.2.3', description: 'Theo quy ước PMI WBS' })
  @IsString()
  @Matches(/^\d+(\.\d+)*$/, { message: 'wbs_code phải theo pattern 1.2.3' })
  @Length(1, 20)
  wbs_code: string;

  @ApiProperty({ example: 'Hệ thống PCCC' })
  @IsString()
  @IsNotEmpty()
  @Length(3, 200)
  name: string;

  @ApiProperty({ example: 2, description: 'Level 1-5' })
  @IsInt()
  @Min(1)
  @Max(5)
  level: number;

  @ApiProperty({ enum: WbsNodeType })
  @IsEnum(WbsNodeType)
  node_type: WbsNodeType;

  @ApiPropertyOptional({ description: 'Bigint VND dạng string (≥0)' })
  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, {
    message: 'budget_vnd phải là số nguyên không âm (VND)',
  })
  budget_vnd?: string;

  @ApiPropertyOptional({ description: 'Thứ tự sắp xếp trong cùng cấp' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  responsible_employee_id?: string;
}
