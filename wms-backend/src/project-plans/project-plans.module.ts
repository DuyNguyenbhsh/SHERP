import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectPlan, PlanApprovalLog } from './entities/project-plan.entity';
import { PlanNotification } from './entities/plan-notification.entity';
import { ProjectPlansController } from './project-plans.controller';
import { ProjectPlansService } from './project-plans.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProjectPlan, PlanApprovalLog, PlanNotification]),
  ],
  controllers: [ProjectPlansController],
  providers: [ProjectPlansService],
  exports: [ProjectPlansService],
})
export class ProjectPlansModule {}
