import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ description: 'Email hoặc username', example: 'admin' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập email hoặc tên đăng nhập' })
  @MaxLength(100)
  username: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token reset nhận từ email' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ description: 'Mật khẩu mới', example: 'NewPass@123' })
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  new_password: string;
}
