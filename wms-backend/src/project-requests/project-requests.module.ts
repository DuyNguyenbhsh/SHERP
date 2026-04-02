import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectRequest } from './entities/project-request.entity';
import { WorkflowLog } from './entities/workflow-log.entity';
import { ProjectRequestsController } from './project-requests.controller';
import { ProjectRequestsService } from './project-requests.service';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProjectRequest, WorkflowLog]),
    forwardRef(() => ProjectsModule),
  ],
  controllers: [ProjectRequestsController],
  providers: [ProjectRequestsService],
  exports: [ProjectRequestsService],
})
export class ProjectRequestsModule {}
