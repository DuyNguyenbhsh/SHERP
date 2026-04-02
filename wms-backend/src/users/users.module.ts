import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

// Import các Entities cần thiết để xử lý tài khoản
import { User } from './entities/user.entity';
import { Employee } from './entities/employee.entity';
import { Role } from './entities/role.entity';
import { UserRole } from './entities/user-role.entity';

@Module({
  imports: [
    // Đăng ký các bảng này vào TypeORM để Service có thể gọi this.userRepo...
    TypeOrmModule.forFeature([User, Employee, Role, UserRole]),
  ],
  controllers: [UsersController], // <--- DÒNG QUAN TRỌNG: Mở cổng API
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
