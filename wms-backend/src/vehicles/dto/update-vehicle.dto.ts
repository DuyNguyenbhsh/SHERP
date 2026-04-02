import { PartialType } from '@nestjs/swagger';
import { CreateVehicleDto } from './create-vehicle.dto';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {
  @ApiPropertyOptional({ description: 'Trạng thái xe', example: 'Sẵn sàng' })
  @IsString({ message: 'Trạng thái phải là chuỗi ký tự' })
  @IsOptional()
  @MaxLength(50)
  status?: string;
}
