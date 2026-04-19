import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ToggleItemDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  is_done: boolean;
}
