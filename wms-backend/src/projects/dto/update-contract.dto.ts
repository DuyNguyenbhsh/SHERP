import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateContractDto {
  @ApiPropertyOptional({
    description: 'So hop dong CDT',
    example: 'HD-2026-001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  contract_number?: string;

  @ApiPropertyOptional({
    description: 'Gia tri hop dong CDT (VND)',
    example: 45000000000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  contract_value?: number;

  @ApiPropertyOptional({
    description: 'Ngay ky hop dong',
    example: '2026-05-01',
  })
  @IsOptional()
  @IsString()
  contract_date?: string;
}
