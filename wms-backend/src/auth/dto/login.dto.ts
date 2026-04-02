import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: 'Tên đăng nhập', example: 'admin' })
  @IsString()
  @IsNotEmpty({ message: 'Tên đăng nhập không được để trống' })
  @MaxLength(100)
  username: string;

  @ApiProperty({ description: 'Mật khẩu', example: 'Admin@123' })
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  password: string;
}
