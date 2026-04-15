import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RollbackVersionDto {
  @ApiProperty({
    description: 'Lý do rollback (tối thiểu 10 ký tự)',
    example: 'Rollback do phiên bản mới có lỗi tính toán BOQ',
  })
  @IsString()
  @MinLength(10, { message: 'Lý do rollback tối thiểu 10 ký tự' })
  @MaxLength(1000)
  reason: string;
}
