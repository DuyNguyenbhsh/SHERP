import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsUUID,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ description: 'ID Nhan vien (employees.id)', example: 'uuid' })
  @IsUUID('4', { message: 'Employee ID khong hop le' })
  @IsNotEmpty({ message: 'Phai chon nhan vien' })
  employee_id: string;

  @ApiProperty({
    description: 'Ten dang nhap (duy nhat)',
    example: 'nguyenvana',
  })
  @IsString()
  @IsNotEmpty({ message: 'Ten dang nhap khong duoc de trong' })
  @MaxLength(100)
  username: string;

  @ApiProperty({ description: 'Mat khau', example: 'Abc@1234' })
  @IsString()
  @IsNotEmpty({ message: 'Mat khau khong duoc de trong' })
  @MinLength(6, { message: 'Mat khau phai co it nhat 6 ky tu' })
  password: string;

  @ApiProperty({ description: 'ID Role (bat buoc)', example: 'uuid' })
  @IsUUID('4', { message: 'Role ID khong hop le' })
  @IsNotEmpty({ message: 'Phai chon vai tro' })
  role_id: string;
}
