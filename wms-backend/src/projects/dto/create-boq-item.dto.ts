import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsNumber,
  Min,
} from 'class-validator';

export class CreateBoqItemDto {
  @ApiProperty({ example: 'BOQ-001' })
  @IsString()
  @IsNotEmpty()
  item_code: string;

  @ApiProperty({ example: 'Xi măng PCB40' })
  @IsString()
  @IsNotEmpty()
  item_name: string;

  @ApiProperty({ example: 'tấn' })
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiProperty({ example: 150.5 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ example: 2500000 })
  @IsNumber()
  @Min(0)
  unit_price: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  wbs_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  product_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  category_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
