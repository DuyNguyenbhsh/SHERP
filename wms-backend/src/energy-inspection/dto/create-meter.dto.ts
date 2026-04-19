import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
import { MeterType } from '../enums/energy.enum';

export class CreateMeterDto {
  @ApiProperty({ example: 'EM-TOWER-A-L3-01' })
  @IsString()
  @Length(3, 40)
  code: string;

  @ApiProperty({ example: 'Đồng hồ điện tổng tầng 3' })
  @IsString()
  @Length(3, 200)
  name: string;

  @ApiProperty()
  @IsUUID()
  project_id: string;

  @ApiProperty({ enum: MeterType })
  @IsEnum(MeterType)
  meter_type: MeterType;

  @ApiProperty({ example: 'kWh' })
  @IsString()
  @Length(1, 20)
  unit: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 200)
  location_text?: string;

  @ApiPropertyOptional({
    default: true,
    description: 'true = đồng hồ tổng (non-decreasing)',
  })
  @IsOptional()
  @IsBoolean()
  is_cumulative?: boolean;
}
