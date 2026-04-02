import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApprovalConfig } from './entities/approval-config.entity';
import { ApprovalConfigStep } from './entities/approval-config-step.entity';
import { ApprovalRequest } from './entities/approval-request.entity';
import { ApprovalStep } from './entities/approval-step.entity';
import { Role } from '../users/entities/role.entity';
import { ApprovalsController } from './approvals.controller';
import { ApprovalsService } from './approvals.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ApprovalConfig,
      ApprovalConfigStep,
      ApprovalRequest,
      ApprovalStep,
      Role,
    ]),
  ],
  controllers: [ApprovalsController],
  providers: [ApprovalsService],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
