import { Loader2, History } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuditLogs, type AuditLogEntry } from '@/entities/employee/api/useAuditLogs'

interface AuditLogDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeId: string | null
  employeeName: string
}

const ACTION_LABELS: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  CREATE: { label: 'Tạo mới', variant: 'default' },
  UPDATE: { label: 'Cập nhật', variant: 'secondary' },
  DELETE: { label: 'Xóa', variant: 'destructive' },
  STATUS_CHANGE: { label: 'Đổi trạng thái', variant: 'outline' },
}

function formatChanges(log: AuditLogEntry): string {
  if (log.action === 'CREATE') {
    return 'Tạo mới nhân viên'
  }

  if (log.action === 'DELETE') {
    return 'Xóa nhân viên (soft delete)'
  }

  if (log.changes) {
    const parts: string[] = []
    const fieldLabels: Record<string, string> = {
      full_name: 'Họ tên',
      email: 'Email',
      phone: 'SĐT',
      job_title: 'Chức vụ',
      status: 'Trạng thái',
      employee_code: 'Mã NV',
      department: 'Phòng ban',
    }

    for (const [key, val] of Object.entries(log.changes)) {
      const label = fieldLabels[key] ?? key
      const oldVal = val.old ?? '(trống)'
      const newVal = val.new ?? '(trống)'
      parts.push(`${label}: ${String(oldVal)} → ${String(newVal)}`)
    }

    return parts.length > 0 ? parts.join('; ') : 'Không có thay đổi chi tiết'
  }

  if (log.action === 'STATUS_CHANGE' && log.old_data && log.new_data) {
    return `Trạng thái: ${String(log.old_data.status)} → ${String(log.new_data.status)}`
  }

  return '—'
}

function formatDate(isoStr: string): string {
  const d = new Date(isoStr)
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function AuditLogDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
}: AuditLogDialogProps): React.JSX.Element {
  const { data: logs, isLoading } = useAuditLogs(employeeId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Lịch sử thay đổi
          </DialogTitle>
          <DialogDescription>
            Nhân viên: <strong>{employeeName}</strong>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !logs?.length ? (
          <div className="py-8 text-center text-muted-foreground">
            Chưa có lịch sử thay đổi nào.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Thời gian</TableHead>
                <TableHead className="w-[120px]">Người sửa</TableHead>
                <TableHead>Nội dung sửa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const actionInfo = ACTION_LABELS[log.action] ?? {
                  label: log.action,
                  variant: 'outline' as const,
                }
                return (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </TableCell>
                    <TableCell className="text-sm">{log.actor_name ?? 'Hệ thống'}</TableCell>
                    <TableCell>
                      <div className="flex items-start gap-2">
                        <Badge variant={actionInfo.variant} className="shrink-0 text-xs">
                          {actionInfo.label}
                        </Badge>
                        <span className="text-sm">{formatChanges(log)}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  )
}
