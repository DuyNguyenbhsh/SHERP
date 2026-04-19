import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { ChecklistResultType } from '../enums/checklist.enum';

export class CreateItemTemplateDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  display_order: number;

  @ApiProperty({ example: 'Kiểm tra bình chữa cháy tầng 3 — còn áp suất?' })
  @IsString()
  @IsNotEmpty()
  @Length(3, 500)
  content: string;

  @ApiProperty({
    enum: ChecklistResultType,
    default: ChecklistResultType.PASS_FAIL,
  })
  @IsEnum(ChecklistResultType)
  result_type: ChecklistResultType;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  require_photo?: boolean;

  @ApiPropertyOptional({ example: 'bar' })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  value_unit?: string;
}
