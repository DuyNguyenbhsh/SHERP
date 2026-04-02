import {
  IsUUID,
  IsInt,
  IsOptional,
  IsString,
  IsEnum,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OutboundStatus } from '../enums/outbound.enum';

// DTO xác nhận Pick (lấy hàng) cho 1 dòng
export class PickItemDto {
  @ApiProperty({
    description: 'UUID vị trí kệ lấy hàng',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'location_id phải là UUID hợp lệ' })
  location_id: string;

  @ApiProperty({ description: 'Số lượng lấy', example: 10 })
  @IsInt({ message: 'Số lượng lấy phải là số nguyên' })
  @Min(1, { message: 'Số lượng lấy phải lớn hơn 0' })
  pick_qty: number;

  @ApiPropertyOptional({ description: 'Số lô' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  lot_number?: string;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsString()
  @IsOptional()
  notes?: string;
}

// DTO cập nhật trạng thái phiếu xuất kho
export class UpdateOutboundStatusDto {
  @ApiProperty({
    description: 'Trạng thái mới',
    enum: OutboundStatus,
    example: 'PICKING',
  })
  @IsEnum(OutboundStatus, { message: 'Trạng thái không hợp lệ' })
  status: OutboundStatus;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsString()
  @IsOptional()
  notes?: string;
}
