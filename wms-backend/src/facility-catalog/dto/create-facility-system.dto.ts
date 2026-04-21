import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
} from 'class-validator';

export class CreateFacilitySystemDto {
  @ApiProperty({
    example: 'FS_CUSTOM_001',
    description: 'Mã hệ thống duy nhất',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 32)
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'Mã chỉ chấp nhận chữ in hoa/số/underscore',
  })
  code: string;

  @ApiProperty({ example: 'Hệ thống ABC' })
  @IsString()
  @Length(2, 200)
  name_vi: string;

  @ApiPropertyOptional({ example: 'ABC System' })
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
