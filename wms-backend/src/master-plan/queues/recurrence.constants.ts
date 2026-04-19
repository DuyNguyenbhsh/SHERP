export const MASTER_PLAN_RECURRENCE_QUEUE = 'master-plan-recurrence';

export type DailyScanJobData = { runAt: string };
export type GenerateItemJobData = {
  taskTemplateId: string;
  scheduledDate: string; // YYYY-MM-DD
};
