import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthLogService } from './auth-log.service';
import { MailService } from './mail.service';
import { JwtStrategy } from './jwt.strategy';
import { TokenBlocklistService } from './token-blocklist.service';

import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user-role.entity';
import { RolePrivilege } from '../users/entities/role-privilege.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { AuthLog } from './entities/auth-log.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { Employee } from '../users/entities/employee.entity';
import { ProjectAssignment } from '../projects/entities/project-assignment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserRole,
      RolePrivilege,
      RefreshToken,
      AuthLog,
      PasswordResetToken,
      Employee,
      ProjectAssignment,
    ]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_ACCESS_EXPIRES_IN') || '15m',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthLogService,
    MailService,
    JwtStrategy,
    TokenBlocklistService,
  ],
  exports: [AuthService, TokenBlocklistService],
})
export class AuthModule {}
