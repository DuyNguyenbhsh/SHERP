import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  REPORTS_EXPORT_QUEUE,
  ReportExportJobData,
  ReportExportJobResult,
} from './reports-export.constants';

@Processor(REPORTS_EXPORT_QUEUE, { concurrency: 2 })
export class ReportsExportProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportsExportProcessor.name);

  async process(
    job: Job<ReportExportJobData, ReportExportJobResult>,
  ): Promise<ReportExportJobResult> {
    const { reportType, params, userId } = job.data;
    this.logger.log(
      `[${job.id}] Bắt đầu export ${reportType} cho user=${userId}`,
    );

    // TODO: thay phần giả lập này bằng logic thật:
    //   1. Dùng ReportsService.query(reportType, params) → lấy dữ liệu
    //   2. Dùng ExcelService.build(rows, columns) → Buffer
    //   3. Dùng CloudStorageService.upload(buffer, fileName) → URL public
    //   4. await job.updateProgress(50), (75), ...
    await job.updateProgress(25);
    await new Promise((r) => setTimeout(r, 500));
    await job.updateProgress(75);
    await new Promise((r) => setTimeout(r, 500));

    const fileName =
      job.data.fileName ||
      `${reportType}-${new Date().toISOString().slice(0, 10)}.xlsx`;

    return {
      downloadUrl: `https://placeholder.invalid/${job.id}/${fileName}`,
      fileName,
      sizeBytes: 0,
      generatedAt: new Date().toISOString(),
    };
  }
}
