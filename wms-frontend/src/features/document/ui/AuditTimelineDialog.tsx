import { Activity, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useDocumentAuditLogs } from '@/entities/document'
import type { DocumentAuditAction } from '@/entities/document'

interface AuditTimelineDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentId: string
  documentName: string
}

const actionLabel: Record<DocumentAuditAction, string> = {
  CREATED: 'Tạo tài liệu',
  UPLOADED_VERSION: 'Upload phiên bản',
  VIEWED: 'Xem',
  DOWNLOADED: 'Tải xuống',
  SUBMITTED_APPROVAL: 'Gửi phê duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  ROLLBACK: 'Rollback',
  ARCHIVED: 'Lưu trữ',
}

const actionColor: Record<DocumentAuditAction, string> = {
  CREATED: 'bg-blue-100 text-blue-800',
  UPLOADED_VERSION: 'bg-violet-100 text-violet-800',
  VIEWED: 'bg-gray-100 text-gray-700',
  DOWNLOADED: 'bg-gray-100 text-gray-700',
  SUBMITTED_APPROVAL: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  ROLLBACK: 'bg-orange-100 text-orange-800',
  ARCHIVED: 'bg-slate-100 text-slate-700',
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function AuditTimelineDialog({
  open,
  onOpenChange,
  documentId,
  documentName,
}: AuditTimelineDialogProps): React.JSX.Element {
  const { data: logs, isLoading, error } = useDocumentAuditLogs(open ? documentId : undefined)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" /> Nhật ký hoạt động
          </DialogTitle>
          <DialogDescription>{documentName}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Cần quyền VIEW_AUDIT để xem nhật ký
          </div>
        ) : !logs?.length ? (
          <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            Chưa có hoạt động
          </div>
        ) : (
          <div className="max-h-[500px] space-y-2 overflow-y-auto pr-2">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 rounded-lg border p-3">
                <div className="flex flex-col items-center">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <div className="mt-1 w-px flex-1 bg-gray-200" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={actionColor[log.action] ?? ''}>
                      {actionLabel[log.action] ?? log.action}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{log.entity_type}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(log.created_at)}
                    {log.actor_id && ` · ${log.actor_id.slice(0, 8)}`}
                  </p>
                  {log.new_data && (
                    <pre className="overflow-x-auto rounded bg-gray-50 p-2 text-xs text-gray-700">
                      {JSON.stringify(log.new_data, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
