import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Plus,
  Loader2,
  FolderOpen,
  FileText,
  Trash2,
  ArrowLeft,
  Bell,
  BellRing,
  CheckCheck,
  AlertTriangle,
  ExternalLink,
  Upload,
  History,
  Send,
  Activity,
  MoreVertical,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  useFolders,
  useDeleteDocument,
  useDocumentNotifications,
  useGenerateNotifications,
  useMarkAllNotificationsRead,
} from '@/entities/document'
import type { ProjectFolder, ProjectDocument, DocumentNotification } from '@/entities/document'
import { useProjects } from '@/entities/project'
import { AddDocumentDialog } from '@/features/document/ui/AddDocumentDialog'
import { UploadVersionDialog } from '@/features/document/ui/UploadVersionDialog'
import { VersionHistoryDialog } from '@/features/document/ui/VersionHistoryDialog'
import { SubmitApprovalDialog } from '@/features/document/ui/SubmitApprovalDialog'
import { AuditTimelineDialog } from '@/features/document/ui/AuditTimelineDialog'
import { DocumentStatusBadge } from '@/features/document/ui/DocumentStatusBadge'

// ── Status helpers ──

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function daysUntilExpiry(dateStr: string | null): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// ── Document Table per Folder ──

type DocAction =
  | { kind: 'upload'; doc: ProjectDocument }
  | { kind: 'history'; doc: ProjectDocument }
  | { kind: 'submit'; doc: ProjectDocument }
  | { kind: 'audit'; doc: ProjectDocument }

function FolderDocuments({
  folder,
  projectId: _projectId,
  onAddDocument,
  onDocAction,
}: {
  folder: ProjectFolder
  projectId: string
  onAddDocument: (folderId: string, folderName: string) => void
  onDocAction: (action: DocAction) => void
}) {
  const deleteMut = useDeleteDocument()
  const docs = folder.documents ?? []

  const handleDelete = (doc: ProjectDocument) => {
    deleteMut.mutate(doc.id, {
      onSuccess: () => toast.success(`Đã xóa "${doc.document_name}"`),
      onError: () => toast.error('Xóa thất bại'),
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-violet-500" />
          <h3 className="text-sm font-semibold">{folder.folder_name}</h3>
          <span className="text-xs text-muted-foreground">({docs.length} tài liệu)</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => onAddDocument(folder.id, folder.folder_name)}
        >
          <Plus className="h-3 w-3" /> Thêm
        </Button>
      </div>

      {docs.length === 0 ? (
        <div className="flex items-center justify-center rounded-lg border border-dashed py-8 text-sm text-muted-foreground">
          <FileText className="mr-2 h-4 w-4" /> Chưa có tài liệu
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên tài liệu</TableHead>
              <TableHead>Hết hạn</TableHead>
              <TableHead>Còn lại</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ghi chú</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {docs.map((doc) => {
              const days = daysUntilExpiry(doc.expiry_date)
              return (
                <TableRow
                  key={doc.id}
                  className={
                    doc.status === 'EXPIRED'
                      ? 'bg-red-50/50'
                      : doc.status === 'EXPIRING_SOON'
                        ? 'bg-amber-50/50'
                        : doc.status === 'PENDING_APPROVAL'
                          ? 'bg-amber-50/30'
                          : doc.status === 'APPROVED'
                            ? 'bg-green-50/30'
                            : ''
                  }
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                      <span className="font-medium">{doc.document_name}</span>
                      {doc.file_url && (
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(doc.expiry_date)}</TableCell>
                  <TableCell>
                    {days !== null && days !== undefined ? (
                      <span
                        className={`text-sm font-medium ${days <= 0 ? 'text-red-600' : days <= 30 ? 'text-amber-600' : 'text-green-600'}`}
                      >
                        {days <= 0 ? `Quá hạn ${Math.abs(days)} ngày` : `${days} ngày`}
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    <DocumentStatusBadge status={doc.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {doc.notes ?? '—'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onDocAction({ kind: 'upload', doc })}>
                          <Upload className="mr-2 h-3.5 w-3.5" /> Upload phiên bản mới
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDocAction({ kind: 'history', doc })}>
                          <History className="mr-2 h-3.5 w-3.5" /> Lịch sử phiên bản
                        </DropdownMenuItem>
                        {doc.current_version_id && (
                          <DropdownMenuItem
                            disabled={doc.status === 'PENDING_APPROVAL'}
                            onClick={() => onDocAction({ kind: 'submit', doc })}
                          >
                            <Send className="mr-2 h-3.5 w-3.5" /> Gửi phê duyệt
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => onDocAction({ kind: 'audit', doc })}>
                          <Activity className="mr-2 h-3.5 w-3.5" /> Nhật ký
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(doc)}
                          disabled={deleteMut.isPending}
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" /> Xóa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

// ── Notifications Panel ──

function NotificationsPanel({ notifications }: { notifications: DocumentNotification[] }) {
  const markAllRead = useMarkAllNotificationsRead()

  const typeLabel: Record<string, string> = {
    EXPIRING_30_DAYS: 'Hết hạn trong 30 ngày',
    EXPIRING_7_DAYS: 'Hết hạn trong 7 ngày',
    EXPIRED: 'Đã hết hạn',
  }

  const typeIcon: Record<string, string> = {
    EXPIRING_30_DAYS: 'text-amber-500',
    EXPIRING_7_DAYS: 'text-orange-500',
    EXPIRED: 'text-red-500',
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Bell className="mb-2 h-8 w-8" />
        <p className="text-sm">Không có thông báo</p>
      </div>
    )
  }

  const unread = notifications.filter((n) => !n.is_read)

  return (
    <div className="space-y-3">
      {unread.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{unread.length} chưa đọc</span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() =>
              markAllRead.mutate(undefined, {
                onSuccess: () => toast.success('Đã đánh dấu tất cả đã đọc'),
              })
            }
          >
            <CheckCheck className="h-3 w-3" /> Đọc tất cả
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${n.is_read ? 'bg-white' : 'bg-amber-50/50 border-amber-200'}`}
          >
            <AlertTriangle
              className={`mt-0.5 h-4 w-4 shrink-0 ${typeIcon[n.notification_type] ?? 'text-gray-400'}`}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-800">{n.document.document_name}</p>
              <p className="text-xs text-gray-500">
                {n.document.folder?.folder_name} &middot; {typeLabel[n.notification_type]}
              </p>
              <p className="text-xs text-gray-400">{formatDate(n.created_at)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── MAIN PAGE ──

export function ProjectDocumentsPage(): React.JSX.Element {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: projects } = useProjects()
  const { data: folders, isLoading } = useFolders(projectId)
  const { data: notifications } = useDocumentNotifications()
  const generateMut = useGenerateNotifications()

  const [addDialog, setAddDialog] = useState<{ folderId: string; folderName: string } | null>(null)
  const [docAction, setDocAction] = useState<DocAction | null>(null)

  const project = useMemo(() => projects?.find((p) => p.id === projectId), [projects, projectId])

  // Filter notifications for this project
  const projectNotifications = useMemo(
    () => (notifications ?? []).filter((n) => n.document?.project_id === projectId),
    [notifications, projectId],
  )

  const unreadCount = projectNotifications.filter((n) => !n.is_read).length

  // Summary stats
  const stats = useMemo(() => {
    if (!folders) return { total: 0, expiring: 0, expired: 0 }
    let total = 0,
      expiring = 0,
      expired = 0
    for (const f of folders) {
      for (const d of f.documents ?? []) {
        total++
        if (d.status === 'EXPIRING_SOON') expiring++
        if (d.status === 'EXPIRED') expired++
      }
    }
    return { total, expiring, expired }
  }, [folders])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/projects">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tài liệu dự án</h1>
            {project && (
              <p className="text-sm text-muted-foreground">
                {project.project_code} — {project.project_name}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() =>
            generateMut.mutate(undefined, {
              onSuccess: () => toast.success('Đã kiểm tra và tạo thông báo hết hạn'),
              onError: () => toast.error('Lỗi khi tạo thông báo'),
            })
          }
          disabled={generateMut.isPending}
        >
          {generateMut.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <BellRing className="h-3.5 w-3.5" />
          )}
          Kiểm tra hết hạn
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Tổng tài liệu</p>
          <p className="mt-1 text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Thư mục</p>
          <p className="mt-1 text-2xl font-bold">{folders?.length ?? 0}</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
          <p className="text-xs font-medium text-amber-600">Sắp hết hạn</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{stats.expiring}</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50/50 p-4">
          <p className="text-xs font-medium text-red-600">Đã hết hạn</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{stats.expired}</p>
        </div>
      </div>

      {/* Tabs: Folders vs Notifications */}
      <Tabs defaultValue="folders">
        <TabsList>
          <TabsTrigger value="folders">Thư mục tài liệu</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1">
            Thông báo
            {unreadCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="folders" className="space-y-6 pt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !folders?.length ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-muted-foreground">
              <FolderOpen className="mb-2 h-8 w-8" />
              <p className="text-sm">Chưa có thư mục. Tạo dự án mới để tự động tạo thư mục.</p>
            </div>
          ) : (
            folders.map((folder) => (
              <FolderDocuments
                key={folder.id}
                folder={folder}
                projectId={projectId!}
                onAddDocument={(folderId, folderName) => setAddDialog({ folderId, folderName })}
                onDocAction={setDocAction}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="notifications" className="pt-4">
          <NotificationsPanel notifications={projectNotifications} />
        </TabsContent>
      </Tabs>

      {/* Add document dialog */}
      {addDialog && (
        <AddDocumentDialog
          open
          onOpenChange={(open) => {
            if (!open) setAddDialog(null)
          }}
          projectId={projectId!}
          folderId={addDialog.folderId}
          folderName={addDialog.folderName}
        />
      )}

      {/* Document Control v2.1 dialogs */}
      {docAction?.kind === 'upload' && (
        <UploadVersionDialog
          open
          onOpenChange={(open) => !open && setDocAction(null)}
          documentId={docAction.doc.id}
          documentName={docAction.doc.document_name}
        />
      )}
      {docAction?.kind === 'history' && (
        <VersionHistoryDialog
          open
          onOpenChange={(open) => !open && setDocAction(null)}
          documentId={docAction.doc.id}
          documentName={docAction.doc.document_name}
          currentVersionId={docAction.doc.current_version_id}
        />
      )}
      {docAction?.kind === 'submit' && docAction.doc.current_version_id && (
        <SubmitApprovalDialog
          open
          onOpenChange={(open) => !open && setDocAction(null)}
          documentId={docAction.doc.id}
          versionId={docAction.doc.current_version_id}
          versionNumber="phiên bản hiện tại"
          documentName={docAction.doc.document_name}
        />
      )}
      {docAction?.kind === 'audit' && (
        <AuditTimelineDialog
          open
          onOpenChange={(open) => !open && setDocAction(null)}
          documentId={docAction.doc.id}
          documentName={docAction.doc.document_name}
        />
      )}
    </div>
  )
}
