import {
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InboundStatus, QcStatus } from '../enums/inbound.enum';

// DTO cập nhật trạng thái phiếu nhập (chuyển bước trong luồng Dock-to-Stock)
export class UpdateInboundStatusDto {
  @ApiProperty({
    description: 'Trạng thái mới',
    enum: InboundStatus,
    example: 'INSPECTING',
  })
  @IsEnum(InboundStatus, {
    message:
      'Trạng thái không hợp lệ (PENDING | INSPECTING | PUTAWAY | COMPLETED | REJECTED)',
  })
  status: InboundStatus;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsString({ message: 'Ghi chú phải là chuỗi ký tự' })
  @IsOptional()
  notes?: string;
}

// DTO cập nhật kết quả QC cho từng dòng hàng
export class UpdateQcResultDto {
  @ApiProperty({ description: 'Kết quả QC', enum: QcStatus, example: 'PASSED' })
  @IsEnum(QcStatus, {
    message: 'Kết quả QC không hợp lệ (PENDING | PASSED | FAILED | PARTIAL)',
  })
  qc_status: QcStatus;

  @ApiProperty({ description: 'Số lượng đạt', example: 95 })
  @IsInt({ message: 'Số lượng đạt phải là số nguyên' })
  @Min(0, { message: 'Số lượng đạt không được âm' })
  accepted_qty: number;

  @ApiProperty({ description: 'Số lượng lỗi', example: 5 })
  @IsInt({ message: 'Số lượng lỗi phải là số nguyên' })
  @Min(0, { message: 'Số lượng lỗi không được âm' })
  rejected_qty: number;

  @ApiPropertyOptional({ description: 'Ghi chú QC' })
  @IsString({ message: 'Ghi chú phải là chuỗi ký tự' })
  @IsOptional()
  notes?: string;
}

// DTO xác nhận Putaway (lên kệ) — kết nối Inbound → Inventory
export class PutawayDto {
  @ApiProperty({
    description: 'UUID vị trí kệ đích',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'location_id phải là UUID hợp lệ' })
  location_id: string;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsString({ message: 'Ghi chú phải là chuỗi ký tự' })
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}
