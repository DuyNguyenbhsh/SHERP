import { PartialType } from '@nestjs/swagger';
import { CreateEmployeeDto } from './create-employee.dto';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {
  @ApiPropertyOptional({ description: 'Trạng thái', example: 'ACTIVE' })
  @IsString({ message: 'Trạng thái phải là chuỗi ký tự' })
  @IsOptional()
  @MaxLength(50)
  status?: string;
}
