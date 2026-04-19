export const MASTER_PLAN_RECURRENCE_QUEUE = 'master-plan-recurrence';

export type DailyScanJobData = { runAt: string };
export type GenerateItemJobData = {
  taskTemplateId: string;
  scheduledAt: string; // ISO 8601 full timestamp — cho phép BYHOUR=7,14 cùng ngày
};
