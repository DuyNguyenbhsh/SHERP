import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
} from 'class-validator';

export class RecordReadingDto {
  @ApiProperty({ description: 'UUID EnergyMeter' })
  @IsUUID()
  meter_id: string;

  @ApiProperty({
    example: '12345.6700',
    description: 'Giá trị đọc, string để giữ chính xác',
  })
  @IsNumberString()
  value: string;

  @ApiPropertyOptional({ description: 'URL ảnh mặt đồng hồ' })
  @IsOptional()
  @IsUrl()
  photo_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
