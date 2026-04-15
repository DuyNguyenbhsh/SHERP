import type { ProjectStage, ProjectStatus } from '@/entities/project'

export const stageLabel: Record<ProjectStage, string> = {
  PLANNING: 'Planning',
  PERMITTING: 'Permitting',
  CONSTRUCTION: 'Construction',
  MANAGEMENT: 'Management',
}

export const statusLabel: Record<ProjectStatus, string> = {
  DRAFT: 'Nháp',
  BIDDING: 'Đang đấu thầu',
  WON_BID: 'Trúng thầu',
  LOST_BID: 'Trượt thầu',
  ACTIVE: 'Đang triển khai',
  ON_HOLD: 'Tạm dừng',
  SETTLING: 'Đang quyết toán',
  SETTLED: 'Đã quyết toán',
  WARRANTY: 'Bảo hành',
  RETENTION_RELEASED: 'Đã giải tỏa bảo lưu',
  CANCELED: 'Hủy',
}

export const statusVariant: Record<
  ProjectStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  DRAFT: 'outline',
  BIDDING: 'secondary',
  WON_BID: 'default',
  LOST_BID: 'destructive',
  ACTIVE: 'default',
  ON_HOLD: 'secondary',
  SETTLING: 'secondary',
  SETTLED: 'default',
  WARRANTY: 'outline',
  RETENTION_RELEASED: 'default',
  CANCELED: 'destructive',
}

export function vnd(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—'
  return Number(v).toLocaleString('vi-VN') + ' ₫'
}

export function fmtDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
