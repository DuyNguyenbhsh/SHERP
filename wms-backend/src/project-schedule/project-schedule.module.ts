import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectTask } from './entities/project-task.entity';
import { TaskLink } from './entities/task-link.entity';
import { ScheduleBaseline } from './entities/schedule-baseline.entity';
import { ProjectScheduleController } from './project-schedule.controller';
import { ProjectScheduleService } from './project-schedule.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProjectTask, TaskLink, ScheduleBaseline]),
  ],
  controllers: [ProjectScheduleController],
  providers: [ProjectScheduleService],
  exports: [ProjectScheduleService],
})
export class ProjectScheduleModule {}
