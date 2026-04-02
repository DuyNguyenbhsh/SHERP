import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Wrapper chuẩn thay vì dùng AuthGuard('jwt') trực tiếp trong controller.
// Lợi ích:
//   1. Dễ mock khi viết Unit Test (chỉ cần override JwtAuthGuard).
//   2. Một điểm duy nhất để mở rộng logic xác thực sau này (VD: blacklist token).
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
