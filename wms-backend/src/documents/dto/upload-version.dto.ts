import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UploadVersionDto {
  @ApiProperty({
    description: 'Ghi chú thay đổi (bắt buộc, tối thiểu 10 ký tự)',
    example: 'Cập nhật BOQ theo yêu cầu CĐT ngày 14/04/2026',
  })
  @IsString()
  @MinLength(10, { message: 'Ghi chú thay đổi tối thiểu 10 ký tự' })
  @MaxLength(1000)
  change_note: string;
}
