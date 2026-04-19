import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class EnqueueReportExportDto {
  @ApiProperty({
    description: 'Loại báo cáo (ví dụ: INVENTORY_SUMMARY, WAYBILL_LIST)',
    example: 'INVENTORY_SUMMARY',
  })
  @IsString()
  @IsNotEmpty()
  reportType: string;

  @ApiPropertyOptional({
    description: 'Filter/params cho báo cáo',
    example: { from: '2026-01-01', to: '2026-04-18', warehouseCode: 'WH01' },
  })
  @IsObject()
  @IsOptional()
  params?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Tên file mong muốn (không bắt buộc)',
    example: 'ton-kho-2026Q1.xlsx',
  })
  @IsString()
  @IsOptional()
  fileName?: string;
}
