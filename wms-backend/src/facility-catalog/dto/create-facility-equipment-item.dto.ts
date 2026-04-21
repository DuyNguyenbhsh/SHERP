import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Min,
} from 'class-validator';

export class CreateFacilityEquipmentItemDto {
  @ApiProperty({ description: 'UUID hệ thống cha' })
  @IsUUID()
  system_id: string;

  @ApiPropertyOptional({ example: 'FEI_FIRE_PUMP' })
  @IsOptional()
  @IsString()
  @Length(2, 32)
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'Mã chỉ chấp nhận chữ in hoa/số/underscore',
  })
  code?: string;

  @ApiProperty({ example: 'Trạm bơm chữa cháy' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 200)
  name_vi: string;

  @ApiPropertyOptional({ example: 'Fire Pump Station' })
  @IsOptional()
  @IsString()
  @Length(2, 200)
  name_en?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
