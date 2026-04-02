import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

// Import 3 thực thể liên quan đến phân quyền
import { Role } from '../users/entities/role.entity';
import { Privilege } from '../users/entities/privilege.entity';
import { RolePrivilege } from '../users/entities/role-privilege.entity';
import { UserRole } from '../users/entities/user-role.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Role, Privilege, RolePrivilege, UserRole]),
  ],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService], // Mở ra để sau này AuthModule xài ké
})
export class RolesModule {}
