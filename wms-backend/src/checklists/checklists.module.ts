import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChecklistTemplate } from './entities/checklist-template.entity';
import { ChecklistItemTemplate } from './entities/checklist-item-template.entity';
import { ChecklistInstance } from './entities/checklist-instance.entity';
import { ChecklistItemResult } from './entities/checklist-item-result.entity';
import { ChecklistsController } from './checklists.controller';
import { ChecklistsService } from './checklists.service';
import { WorkItemsModule } from '../work-items/work-items.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChecklistTemplate,
      ChecklistItemTemplate,
      ChecklistInstance,
      ChecklistItemResult,
    ]),
    WorkItemsModule,
  ],
  controllers: [ChecklistsController],
  providers: [ChecklistsService],
  exports: [ChecklistsService],
})
export class ChecklistsModule {}
