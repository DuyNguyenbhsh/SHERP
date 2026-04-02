import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { WorkflowSeedService } from './workflow-seed.service';

import { User } from '../users/entities/user.entity';
import { Employee } from '../users/entities/employee.entity';
import { Role } from '../users/entities/role.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { UserRole } from '../users/entities/user-role.entity';
import { Privilege } from '../users/entities/privilege.entity';
import { RolePrivilege } from '../users/entities/role-privilege.entity';
import { Position } from '../organizations/entities/position.entity';
import { SystemSetting } from '../system-settings/entities/system-setting.entity';
import { ApprovalConfig } from '../approvals/entities/approval-config.entity';
import { ApprovalConfigStep } from '../approvals/entities/approval-config-step.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Employee,
      Role,
      Organization,
      UserRole,
      Privilege,
      RolePrivilege,
      Position,
      SystemSetting,
      ApprovalConfig,
      ApprovalConfigStep,
    ]),
  ],
  providers: [SeedService, WorkflowSeedService],
})
export class SeedModule {}
