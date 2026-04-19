import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  REPORTS_EXPORT_QUEUE,
  ReportExportJobData,
  ReportExportJobResult,
} from './reports-export.constants';

@Injectable()
export class ReportsExportService {
  constructor(
    @InjectQueue(REPORTS_EXPORT_QUEUE)
    private readonly queue: Queue<ReportExportJobData, ReportExportJobResult>,
  ) {}

  async enqueue(data: ReportExportJobData): Promise<{ jobId: string }> {
    const job = await this.queue.add('export', data, {
      removeOnComplete: { age: 3600, count: 100 },
      removeOnFail: { age: 24 * 3600 },
      attempts: 2,
      backoff: { type: 'exponential', delay: 2000 },
    });
    return { jobId: String(job.id) };
  }

  async getStatus(jobId: string) {
    const job = await this.queue.getJob(jobId);
    if (!job) throw new NotFoundException('Không tìm thấy job export');
    const state = await job.getState();
    return {
      jobId: String(job.id),
      state,
      progress: job.progress,
      result: job.returnvalue || null,
      failedReason: job.failedReason || null,
      createdAt: job.timestamp ? new Date(job.timestamp).toISOString() : null,
      finishedAt: job.finishedOn
        ? new Date(job.finishedOn).toISOString()
        : null,
    };
  }
}
