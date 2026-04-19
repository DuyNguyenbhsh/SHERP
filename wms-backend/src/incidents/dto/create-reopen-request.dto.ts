import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateReopenRequestDto {
  // BR-INC-04: lý do ≥ 10 ký tự
  @ApiProperty({
    description: 'Lý do mở lại sự cố — tối thiểu 10 ký tự (BR-INC-04)',
  })
  @IsString()
  @MinLength(10, { message: 'BR-INC-04: Lý do phải có ít nhất 10 ký tự' })
  @MaxLength(2000)
  reason: string;
}
