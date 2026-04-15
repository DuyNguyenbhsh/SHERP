import { useState } from 'react'
import { toast } from 'sonner'
import { Archive, ExternalLink, History, Loader2, Undo2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useArchiveVersion, useDocumentVersions, useRollbackVersion } from '@/entities/document'
import type { DocumentVersion } from '@/entities/document'

interface VersionHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentId: string
  documentName: string
  currentVersionId: string | null
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatSize(sizeStr: string): string {
  const bytes = Number(sizeStr)
  if (!bytes) return '—'
  const mb = bytes / 1024 / 1024
  return mb > 1 ? `${mb.toFixed(2)} MB` : `${(bytes / 1024).toFixed(1)} KB`
}

export function VersionHistoryDialog({
  open,
  onOpenChange,
  documentId,
  documentName,
  currentVersionId,
}: VersionHistoryDialogProps): React.JSX.Element {
  const { data: versions, isLoading } = useDocumentVersions(open ? documentId : undefined)
  const rollbackMut = useRollbackVersion()
  const archiveMut = useArchiveVersion()
  const [rollbackTarget, setRollbackTarget] = useState<DocumentVersion | null>(null)
  const [reason, setReason] = useState('')

  const doRollback = (): void => {
    if (!rollbackTarget) return
    if (reason.trim().length < 10) {
      toast.error('Lý do rollback tối thiểu 10 ký tự')
      return
    }
    rollbackMut.mutate(
      { documentId, versionId: rollbackTarget.id, reason: reason.trim() },
      {
        onSuccess: (v) => {
          toast.success(`Đã rollback → ${v.version_number}`)
          setRollbackTarget(null)
          setReason('')
        },
        onError: (e: unknown) => {
          const err = e as { response?: { data?: { message?: string } } }
          toast.error(err.response?.data?.message ?? 'Rollback thất bại')
        },
      },
    )
  }

  const doArchive = (v: DocumentVersion): void => {
    archiveMut.mutate(
      { documentId, versionId: v.id },
      {
        onSuccess: () => toast.success(`Đã archive ${v.version_number}`),
        onError: (e: unknown) => {
          const err = e as { response?: { data?: { message?: string } } }
          toast.error(err.response?.data?.message ?? 'Archive thất bại')
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" /> Lịch sử phiên bản
          </DialogTitle>
          <DialogDescription>{documentName}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : !versions?.length ? (
          <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            Chưa có phiên bản nào
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phiên bản</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead>Kích thước</TableHead>
                <TableHead>Ghi chú</TableHead>
                <TableHead className="w-[140px] text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.map((v) => {
                const isCurrent = v.id === currentVersionId
                return (
                  <TableRow key={v.id} className={isCurrent ? 'bg-blue-50/50' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={isCurrent ? 'default' : 'outline'}>
                          {v.version_number}
                        </Badge>
                        {isCurrent && <span className="text-xs text-blue-600">Hiện tại</span>}
                        {v.is_archived && (
                          <Badge variant="secondary" className="gap-1">
                            <Archive className="h-3 w-3" /> Archived
                          </Badge>
                        )}
                        {v.source_version_id && (
                          <Badge variant="secondary" className="gap-1">
                            <Undo2 className="h-3 w-3" /> Rollback
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{formatDateTime(v.created_at)}</TableCell>
                    <TableCell className="text-sm">{formatSize(v.file_size)}</TableCell>
                    <TableCell className="max-w-[250px] truncate text-sm text-muted-foreground">
                      {v.change_note}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                          <a href={v.file_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                        {!isCurrent && !v.is_archived && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Rollback về phiên bản này"
                              onClick={() => setRollbackTarget(v)}
                            >
                              <Undo2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Archive"
                              onClick={() => doArchive(v)}
                              disabled={archiveMut.isPending}
                            >
                              <Archive className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}

        {/* Rollback confirm inline */}
        {rollbackTarget && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
            <p className="text-sm font-medium">
              Xác nhận rollback về phiên bản {rollbackTarget.version_number}
            </p>
            <p className="mb-2 text-xs text-muted-foreground">
              Hệ thống sẽ tạo phiên bản mới với nội dung của {rollbackTarget.version_number}.
            </p>
            <textarea
              className="w-full rounded border p-2 text-sm"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Lý do rollback (tối thiểu 10 ký tự)..."
            />
            <div className="mt-2 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRollbackTarget(null)
                  setReason('')
                }}
              >
                Hủy
              </Button>
              <Button size="sm" onClick={doRollback} disabled={rollbackMut.isPending}>
                {rollbackMut.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                Xác nhận rollback
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
