import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  MASTER_PLAN_RECURRENCE_QUEUE,
  DailyScanJobData,
  GenerateItemJobData,
} from './recurrence.constants';

@Injectable()
export class RecurrenceProducer {
  constructor(
    @InjectQueue(MASTER_PLAN_RECURRENCE_QUEUE)
    private readonly queue: Queue,
  ) {}

  async enqueueDailyScan(): Promise<string> {
    const job = await this.queue.add(
      'daily-scan',
      { runAt: new Date().toISOString() } satisfies DailyScanJobData,
      {
        removeOnComplete: { age: 3600 },
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );
    return String(job.id);
  }

  async enqueueGenerate(data: GenerateItemJobData): Promise<string> {
    const job = await this.queue.add('generate-item', data, {
      jobId: `gen-${data.taskTemplateId}-${data.scheduledDate}`, // idempotent
      removeOnComplete: { age: 24 * 3600, count: 1000 },
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
    return String(job.id);
  }
}
