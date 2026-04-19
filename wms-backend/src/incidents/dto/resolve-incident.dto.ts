import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  Length,
} from 'class-validator';

export class ResolveIncidentDto {
  // BR-INC-05: resolve phải có AFTER_FIX photos
  @ApiProperty({
    type: [String],
    description: 'Ảnh AFTER_FIX — tối thiểu 1 (BR-INC-05)',
  })
  @IsArray()
  @ArrayMinSize(1, {
    message: 'BR-INC-05: Cần ít nhất 1 ảnh AFTER_FIX khi resolve',
  })
  @ArrayMaxSize(10)
  @IsUrl({}, { each: true })
  photos: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  resolution_note?: string;
}
