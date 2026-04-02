import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProgressReport } from './entities/progress-report.entity';
import { VariationOrder } from './entities/variation-order.entity';
import { ProjectWbs } from '../projects/entities/project-wbs.entity';
import { ProjectCbs } from '../projects/entities/project-cbs.entity';
import { ProjectTransaction } from '../projects/entities/project-transaction.entity';
import { Project } from '../projects/entities/project.entity';
import { ProjectMonitoringController } from './project-monitoring.controller';
import { ProjectMonitoringService } from './project-monitoring.service';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProgressReport,
      VariationOrder,
      ProjectWbs,
      ProjectCbs,
      ProjectTransaction,
      Project,
    ]),
    forwardRef(() => ProjectsModule),
  ],
  controllers: [ProjectMonitoringController],
  providers: [ProjectMonitoringService],
  exports: [ProjectMonitoringService],
})
export class ProjectMonitoringModule {}
