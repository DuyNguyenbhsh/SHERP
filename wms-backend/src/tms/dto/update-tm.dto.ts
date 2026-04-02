import { IsOptional, IsString, IsEnum, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { WaybillStatus, CodStatus } from '../enums/tms.enum';

export class UpdateWaybillDto {
  @ApiPropertyOptional({
    description: 'Trạng thái vận đơn',
    enum: WaybillStatus,
    example: 'IN_TRANSIT',
  })
  @IsEnum(WaybillStatus, { message: 'Trạng thái vận đơn không hợp lệ' })
  @IsOptional()
  status?: WaybillStatus;

  @ApiPropertyOptional({
    description: 'Trạng thái COD',
    enum: CodStatus,
    example: 'COLLECTED',
  })
  @IsEnum(CodStatus, { message: 'Trạng thái COD không hợp lệ' })
  @IsOptional()
  cod_status?: CodStatus;

  @ApiPropertyOptional({ description: 'Tên tài xế' })
  @IsString({ message: 'Tên tài xế phải là chuỗi ký tự' })
  @IsOptional()
  @MaxLength(100)
  driver_name?: string;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsString({ message: 'Ghi chú phải là chuỗi ký tự' })
  @IsOptional()
  notes?: string;
}
