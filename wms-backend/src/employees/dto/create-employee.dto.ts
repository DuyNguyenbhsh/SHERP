import {
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmployeeDto {
  @ApiProperty({ description: 'Mã nhân viên', example: 'EMP-002' })
  @IsString({ message: 'Mã nhân viên phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mã nhân viên không được để trống' })
  @MaxLength(50, { message: 'Mã nhân viên tối đa 50 ký tự' })
  employee_code: string;

  @ApiProperty({ description: 'Họ và tên', example: 'Trần Văn C' })
  @IsString({ message: 'Họ và tên phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  @MaxLength(100, { message: 'Họ và tên tối đa 100 ký tự' })
  full_name: string;

  @ApiPropertyOptional({
    description: 'Email',
    example: 'c.tran@shvisionary.com',
  })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsOptional()
  @MaxLength(100, { message: 'Email tối đa 100 ký tự' })
  email?: string;

  @ApiPropertyOptional({ description: 'SĐT', example: '0909111222' })
  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự' })
  @IsOptional()
  @MaxLength(20, { message: 'Số điện thoại tối đa 20 ký tự' })
  phone_number?: string;

  @ApiPropertyOptional({ description: 'Chức danh', example: 'Thủ kho' })
  @IsString({ message: 'Chức danh phải là chuỗi ký tự' })
  @IsOptional()
  @MaxLength(50, { message: 'Chức danh tối đa 50 ký tự' })
  job_title?: string;

  @ApiProperty({ description: 'UUID phòng ban trực thuộc' })
  @IsUUID('4', { message: 'organization_id phải là UUID hợp lệ' })
  @IsNotEmpty({ message: 'Phải chọn Phòng ban/Chi nhánh trực thuộc' })
  organization_id: string;
}
