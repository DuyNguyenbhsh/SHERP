import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SettlementLineDto {
  @ApiProperty()
  @IsString()
  product_id: string;

  @ApiProperty()
  @IsString()
  product_name: string;

  @ApiProperty()
  @IsString()
  unit: string;

  @ApiProperty({ description: 'Số lượng kiểm kê thực tế tại hiện trường' })
  @IsNumber()
  @Min(0)
  qty_on_site: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  unit_price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateSettlementDto {
  @ApiProperty({ example: '2026-03-24' })
  @IsDateString()
  settlement_date: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [SettlementLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettlementLineDto)
  lines: SettlementLineDto[];
}
