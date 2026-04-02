import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class CreateDocumentDto {
  @ApiProperty({
    description: 'Tên tài liệu',
    example: 'Giấy phép xây dựng số 123/GP',
  })
  @IsString({ message: 'Tên tài liệu phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên tài liệu không được để trống' })
  @MaxLength(255, { message: 'Tên tài liệu tối đa 255 ký tự' })
  document_name: string;

  @ApiPropertyOptional({
    description: 'Đường dẫn file',
    example: 'https://storage.example.com/docs/permit.pdf',
  })
  @IsString()
  @IsOptional()
  file_url?: string;

  @ApiPropertyOptional({ description: 'Loại file', example: 'application/pdf' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  mime_type?: string;

  @ApiPropertyOptional({ description: 'Ngày hết hạn', example: '2027-03-15' })
  @IsDateString({}, { message: 'Ngày hết hạn phải đúng định dạng YYYY-MM-DD' })
  @IsOptional()
  expiry_date?: string;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsString()
  @IsOptional()
  notes?: string;
}
