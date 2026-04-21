import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MasterPlan } from './entities/master-plan.entity';
import { WbsNode } from './entities/wbs-node.entity';
import { TaskTemplate } from './entities/task-template.entity';
import { WorkItem } from '../work-items/entities/work-item.entity';
import { MasterPlanService } from './master-plan.service';
import { MasterPlanController } from './master-plan.controller';
import { AnnualGridService } from './annual-grid.service';
import { ExportXlsxService } from './export-xlsx.service';
import { MASTER_PLAN_RECURRENCE_QUEUE } from './queues/recurrence.constants';
import { RecurrenceProducer } from './queues/recurrence.producer';
import { RecurrenceProcessor } from './queues/recurrence.processor';
import { ChecklistsModule } from '../checklists/checklists.module';
import { OfficeTasksModule } from '../office-tasks/office-tasks.module';
import { EnergyInspectionModule } from '../energy-inspection/energy-inspection.module';
import { FacilityCatalogModule } from '../facility-catalog/facility-catalog.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MasterPlan, WbsNode, TaskTemplate, WorkItem]),
    BullModule.registerQueue({ name: MASTER_PLAN_RECURRENCE_QUEUE }),
    ChecklistsModule,
    OfficeTasksModule,
    EnergyInspectionModule,
    FacilityCatalogModule,
  ],
  controllers: [MasterPlanController],
  providers: [
    MasterPlanService,
    AnnualGridService,
    ExportXlsxService,
    RecurrenceProducer,
    RecurrenceProcessor,
  ],
  exports: [MasterPlanService, RecurrenceProducer],
})
export class MasterPlanModule implements OnModuleInit {
  private readonly logger = new Logger(MasterPlanModule.name);

  constructor(
    @InjectQueue(MASTER_PLAN_RECURRENCE_QUEUE)
    private readonly queue: Queue,
  ) {}

  // BullMQ repeatable job: chạy daily scan 00:05 VN (UTC+7 → 17:05 UTC hôm trước)
  async onModuleInit(): Promise<void> {
    const enabled = process.env.RECURRENCE_CRON_ENABLED !== 'false';
    if (!enabled) {
      this.logger.warn(
        'Recurrence cron disabled qua RECURRENCE_CRON_ENABLED=false',
      );
      return;
    }
    try {
      await this.queue.add(
        'daily-scan',
        { runAt: new Date().toISOString() },
        {
          repeat: { pattern: '5 17 * * *' }, // 00:05 VN = 17:05 UTC
          jobId: 'recurrence-daily-scan-cron',
          removeOnComplete: { age: 3600 },
        },
      );
      this.logger.log(
        'Đã đăng ký repeatable job daily-scan (00:05 VN mỗi ngày)',
      );
    } catch (err) {
      this.logger.warn(`Không đăng ký được cron: ${(err as Error).message}`);
    }
  }
}
