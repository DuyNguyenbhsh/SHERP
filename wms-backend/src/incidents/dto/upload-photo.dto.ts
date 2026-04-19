import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsUrl } from 'class-validator';
import { PhotoCategory } from '../../checklists/enums/checklist.enum';

export class UploadPhotoDto {
  @ApiProperty({ example: 'https://res.cloudinary.com/.../image.jpg' })
  @IsUrl()
  @IsNotEmpty()
  secure_url: string;

  @ApiProperty({ enum: PhotoCategory })
  @IsEnum(PhotoCategory)
  category: PhotoCategory;
}
