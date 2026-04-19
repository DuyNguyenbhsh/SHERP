import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class AddCommentDto {
  @ApiProperty({ example: 'Đã đặt hàng quạt thay thế, ETA 3 ngày' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 2000)
  body: string;
}
