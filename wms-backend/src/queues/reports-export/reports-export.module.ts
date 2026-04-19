import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { REPORTS_EXPORT_QUEUE } from './reports-export.constants';
import { ReportsExportController } from './reports-export.controller';
import { ReportsExportService } from './reports-export.service';
import { ReportsExportProcessor } from './reports-export.processor';

@Module({
  imports: [BullModule.registerQueue({ name: REPORTS_EXPORT_QUEUE })],
  controllers: [ReportsExportController],
  providers: [ReportsExportService, ReportsExportProcessor],
  exports: [ReportsExportService],
})
export class ReportsExportModule {}
