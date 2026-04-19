import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { ChecklistFrequency } from '../enums/checklist.enum';
import { CreateItemTemplateDto } from './create-item-template.dto';

export class CreateChecklistTemplateDto {
  @ApiProperty({ example: 'Checklist PCCC hàng tuần' })
  @IsString()
  @IsNotEmpty()
  @Length(3, 200)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ChecklistFrequency })
  @IsEnum(ChecklistFrequency)
  frequency: ChecklistFrequency;

  @ApiPropertyOptional({ example: 'FIRE_SAFETY' })
  @IsOptional()
  @IsString()
  @Length(2, 40)
  asset_type?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiProperty({ type: [CreateItemTemplateDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateItemTemplateDto)
  items: CreateItemTemplateDto[];
}
