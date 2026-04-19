import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  IsUrl,
  Length,
} from 'class-validator';
import { ItemResultState, PhotoCategory } from '../enums/checklist.enum';

export class SubmitItemResultDto {
  @ApiPropertyOptional({ enum: ItemResultState })
  @IsOptional()
  @IsEnum(ItemResultState)
  result?: ItemResultState;

  @ApiPropertyOptional({
    example: '4.5',
    description: 'Giá trị đo; truyền dưới dạng string để giữ chính xác',
  })
  @IsOptional()
  @IsNumberString()
  value?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Secure URL từ Cloudinary; tối đa 10 ảnh',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl({}, { each: true })
  photos?: string[];

  @ApiPropertyOptional({ enum: PhotoCategory })
  @IsOptional()
  @IsEnum(PhotoCategory)
  photo_category?: PhotoCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  notes?: string;
}
