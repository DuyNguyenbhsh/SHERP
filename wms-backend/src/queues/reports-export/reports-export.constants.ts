export const REPORTS_EXPORT_QUEUE = 'reports-export';

export type ReportExportJobData = {
  reportType: string;
  params: Record<string, unknown>;
  userId: string;
  fileName?: string;
};

export type ReportExportJobResult = {
  downloadUrl: string;
  fileName: string;
  sizeBytes: number;
  generatedAt: string;
};
