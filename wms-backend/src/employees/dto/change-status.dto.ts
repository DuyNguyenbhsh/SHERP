import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn, IsOptional, MaxLength } from 'class-validator';

export class ChangeStatusDto {
  @ApiProperty({
    description: 'Trạng thái mới',
    enum: ['WORKING', 'SUSPENDED', 'TERMINATED'],
  })
  @IsString()
  @IsIn(['WORKING', 'SUSPENDED', 'TERMINATED'], {
    message: 'Trạng thái phải là: WORKING, SUSPENDED hoặc TERMINATED',
  })
  status: string;

  @ApiProperty({ description: 'Lý do thay đổi', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}
