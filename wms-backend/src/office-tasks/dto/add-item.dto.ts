import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Length, Min } from 'class-validator';

export class AddItemDto {
  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  display_order: number;

  @ApiProperty({ example: 'Kiểm tra số liệu báo cáo' })
  @IsString()
  @Length(1, 500)
  content: string;
}
