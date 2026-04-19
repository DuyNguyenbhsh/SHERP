import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OfficeTask } from './entities/office-task.entity';
import { OfficeTaskItem } from './entities/office-task-item.entity';
import { OfficeTasksController } from './office-tasks.controller';
import { OfficeTasksService } from './office-tasks.service';
import { WorkItemsModule } from '../work-items/work-items.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OfficeTask, OfficeTaskItem]),
    WorkItemsModule,
  ],
  controllers: [OfficeTasksController],
  providers: [OfficeTasksService],
  exports: [OfficeTasksService],
})
export class OfficeTasksModule {}
