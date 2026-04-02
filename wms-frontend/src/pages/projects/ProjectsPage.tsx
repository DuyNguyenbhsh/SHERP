import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Loader2, Pencil, Trash2, Check, X, Lock, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useProjects, useUpdateProject, useDeleteProject } from '@/entities/project'
import { useQueryClient } from '@tanstack/react-query'
import { TableActions } from '@/shared/ui'
import { useOrganizations } from '@/entities/organization'
import type { Project, ProjectStage, ProjectStatus } from '@/entities/project'
import { CreateProjectDialog } from '@/features/project/ui/CreateProjectDialog'

// ── Constants ──

const stageLabel: Record<ProjectStage, string> = {
  PLANNING: 'Planning',
  PERMITTING: 'Permitting',
  CONSTRUCTION: 'Construction',
  MANAGEMENT: 'Management',
}
const statusLabel: Record<ProjectStatus, string> = {
  DRAFT: 'Nháp',
  ACTIVE: 'Đang triển khai',
  ON_HOLD: 'Tạm dừng',
  COMPLETED: 'Hoàn thành',
  CANCELED: 'Hủy',
}
const statusVariant: Record<ProjectStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  DRAFT: 'outline',
  ACTIVE: 'default',
  ON_HOLD: 'secondary',
  COMPLETED: 'default',
  CANCELED: 'destructive',
}
const stages: ProjectStage[] = ['PLANNING', 'PERMITTING', 'CONSTRUCTION', 'MANAGEMENT']

// ── Luồng trạng thái hợp lệ (mirror backend) ──
const STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  DRAFT: ['ACTIVE', 'CANCELED'],
  ACTIVE: ['ON_HOLD', 'COMPLETED', 'CANCELED'],
  ON_HOLD: ['ACTIVE', 'CANCELED'],
  COMPLETED: [],
  CANCELED: [],
}

function getAllowedStatuses(current: ProjectStatus): ProjectStatus[] {
  return [current, ...(STATUS_TRANSITIONS[current] ?? [])]
}

function fmtNum(v: number | null | undefined): string {
  if (v == null) return '0.00'
  return Number(v).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtBudget(v: number | null | undefined): string {
  if (v == null) return '—'
  return (
    Number(v).toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' ₫'
  )
}

// ── Inline edit state ──

interface EditRow {
  project_code: string
  project_name: string
  organization_id: string
  stage: ProjectStage
  status: ProjectStatus
  location: string
  gfa_m2: string
}

function projectToEditRow(p: Project): EditRow {
  return {
    project_code: p.project_code,
    project_name: p.project_name,
    organization_id: p.organization_id ?? '',
    stage: p.stage,
    status: p.status,
    location: p.location ?? '',
    gfa_m2: p.gfa_m2 != null ? String(Number(p.gfa_m2)) : '',
  }
}

const NONE = '__none__'

// ══════════════════════════════════════════════════════
// INLINE EDIT ROW
// ══════════════════════════════════════════════════════

interface InlineEditRowProps {
  row: EditRow
  originalStatus: ProjectStatus
  onChange: (field: keyof EditRow, value: string) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  organizations: { id: string; organization_code: string; organization_name: string }[]
}

function InlineEditRow({
  row,
  originalStatus,
  onChange,
  onSave,
  onCancel,
  saving,
  organizations,
}: InlineEditRowProps) {
  const isLocked = originalStatus === 'COMPLETED' || originalStatus === 'CANCELED'
  const allowedStatuses = getAllowedStatuses(originalStatus)

  if (isLocked) {
    // Read-only mode for COMPLETED/CANCELED
    return (
      <TableRow className="bg-gray-50/60">
        <TableCell colSpan={9} className="py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" />
            Dự án ở trạng thái{' '}
            <Badge variant={statusVariant[originalStatus]}>{statusLabel[originalStatus]}</Badge> —
            không thể chỉnh sửa.
          </div>
        </TableCell>
        <TableCell colSpan={2}>
          <div className="flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-400"
              onClick={onCancel}
              title="Đóng"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <TableRow className="bg-violet-50/40">
      <TableCell>
        <Input
          value={row.project_code}
          onChange={(e) => onChange('project_code', e.target.value)}
          className="h-8 text-sm w-[90px]"
        />
      </TableCell>
      <TableCell>
        <Input
          value={row.project_name}
          onChange={(e) => onChange('project_name', e.target.value)}
          className="h-8 text-sm w-[160px]"
        />
      </TableCell>
      <TableCell>
        <Select
          value={row.organization_id || NONE}
          onValueChange={(v) => onChange('organization_id', v === NONE ? '' : v)}
        >
          <SelectTrigger className="h-8 text-sm w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— Không —</SelectItem>
            {organizations.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.organization_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Select value={row.stage} onValueChange={(v) => onChange('stage', v)}>
          <SelectTrigger className="h-8 text-sm w-[110px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {stages.map((s) => (
              <SelectItem key={s} value={s}>
                {stageLabel[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Select value={row.status} onValueChange={(v) => onChange('status', v)}>
          <SelectTrigger className="h-8 text-sm w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {allowedStatuses.map((s) => (
              <SelectItem key={s} value={s}>
                {statusLabel[s]}
                {s !== originalStatus && (
                  <span className="ml-1 text-xs text-muted-foreground">→</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>—</TableCell>
      <TableCell>—</TableCell>
      <TableCell>
        <Input
          value={row.location}
          onChange={(e) => onChange('location', e.target.value)}
          className="h-8 text-sm w-[120px]"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          step="0.01"
          value={row.gfa_m2}
          onChange={(e) => onChange('gfa_m2', e.target.value)}
          className="h-8 text-sm w-[90px] text-right"
        />
      </TableCell>
      <TableCell>
        {/* Budget: cảnh báo nếu ACTIVE */}
        {originalStatus === 'ACTIVE' ? (
          <div
            className="flex items-center gap-1 text-xs text-amber-600"
            title="Thay đổi ngân sách sẽ tạo bản ghi điều chỉnh"
          >
            <AlertTriangle className="h-3 w-3 shrink-0" />
            <span className="truncate w-[80px]">Khóa ngân sách</span>
          </div>
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-green-600 hover:bg-green-50"
            onClick={onSave}
            disabled={saving}
            title="Lưu"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-400 hover:text-gray-600"
            onClick={onCancel}
            disabled={saving}
            title="Hủy"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

// ══════════════════════════════════════════════════════
// DISPLAY ROW
// ══════════════════════════════════════════════════════

function DisplayRow({
  project: p,
  onEdit,
  onDelete,
}: {
  project: Project
  onEdit: () => void
  onDelete: () => void
}) {
  const isLocked = p.status === 'COMPLETED' || p.status === 'CANCELED'
  return (
    <TableRow className={`group ${isLocked ? 'opacity-60' : ''}`}>
      <TableCell className="font-medium">
        <Link to={`/projects/${p.id}`} className="text-blue-600 hover:underline">
          {p.project_code}
        </Link>
      </TableCell>
      <TableCell>
        <Link to={`/projects/${p.id}`} className="hover:underline">
          {p.project_name}
        </Link>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {p.organization?.organization_name ?? '—'}
      </TableCell>
      <TableCell>
        <Badge variant="outline">{stageLabel[p.stage]}</Badge>
      </TableCell>
      <TableCell>
        <Badge variant={statusVariant[p.status]}>{statusLabel[p.status]}</Badge>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">{p.manager?.full_name ?? '—'}</TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {p.department?.organization_name ?? '—'}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">{p.location ?? '—'}</TableCell>
      <TableCell className="text-right font-mono text-sm">{fmtNum(p.gfa_m2)}</TableCell>
      <TableCell className="text-right font-mono text-sm">{fmtBudget(p.budget)}</TableCell>
      <TableCell>
        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-violet-400 hover:text-violet-600 hover:bg-violet-50"
            title={isLocked ? 'Xem (Đã khóa)' : 'Sửa'}
            onClick={onEdit}
          >
            {isLocked ? <Lock className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
          </Button>
          {!isLocked && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-violet-400 hover:text-red-600 hover:bg-red-50"
              title="Lưu trữ"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}

// ══════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════

export function ProjectsPage(): React.JSX.Element {
  const { data: projects, isLoading } = useProjects()
  const { data: organizations } = useOrganizations()
  const updateMutation = useUpdateProject()
  const deleteMutation = useDeleteProject()
  const queryClient = useQueryClient()

  const [createOpen, setCreateOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingOriginalStatus, setEditingOriginalStatus] = useState<ProjectStatus>('DRAFT')
  const [editRow, setEditRow] = useState<EditRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [deleting, setDeleting] = useState(false)

  const startEdit = (p: Project) => {
    setEditingId(p.id)
    setEditingOriginalStatus(p.status)
    setEditRow(projectToEditRow(p))
  }
  const cancelEdit = () => {
    setEditingId(null)
    setEditRow(null)
  }

  const handleFieldChange = (field: keyof EditRow, value: string) => {
    setEditRow((prev) => (prev ? { ...prev, [field]: value } : prev))
  }

  const handleSave = () => {
    if (!editingId || !editRow) return
    if (!editRow.project_code.trim() || !editRow.project_name.trim()) {
      toast.error('Mã và tên dự án không được để trống')
      return
    }
    setSaving(true)
    const gfa = editRow.gfa_m2 ? parseFloat(editRow.gfa_m2) : undefined
    updateMutation.mutate(
      {
        id: editingId,
        project_code: editRow.project_code,
        project_name: editRow.project_name,
        organization_id: editRow.organization_id || undefined,
        stage: editRow.stage,
        status: editRow.status,
        location: editRow.location || undefined,
        gfa_m2: gfa != null && !isNaN(gfa) ? gfa : undefined,
      },
      {
        onSuccess: () => {
          toast.success('Cập nhật thành công')
          cancelEdit()
        },
        onError: (err: unknown) => {
          toast.error(
            isAxiosError(err) && err.response?.data?.message
              ? err.response.data.message
              : 'Cập nhật thất bại',
          )
        },
        onSettled: () => setSaving(false),
      },
    )
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    setDeleting(true)
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(`Đã lưu trữ dự án "${deleteTarget.project_name}"`)
        setDeleteTarget(null)
      },
      onError: (err: unknown) => {
        toast.error(
          isAxiosError(err) && err.response?.data?.message
            ? err.response.data.message
            : 'Lưu trữ thất bại',
        )
      },
      onSettled: () => setDeleting(false),
    })
  }

  const orgList =
    organizations?.map((o) => ({
      id: o.id,
      organization_code: o.organization_code,
      organization_name: o.organization_name,
    })) ?? []
  const colCount = 11

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Danh sách Dự án</h1>
        <div className="flex items-center gap-3">
          <TableActions
            templateUrl="/projects/excel/template"
            importUrl="/projects/excel/import"
            exportUrl="/projects/excel/export"
            importTitle="Import Dự án"
            importDescription="Tải lên file Excel để import/cập nhật dự án hàng loạt. Sử dụng nút 'Tải mẫu' để lấy file mẫu."
            onImportSuccess={() => void queryClient.invalidateQueries({ queryKey: ['projects'] })}
          />
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Tạo dự án
          </Button>
        </div>
      </div>

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />

      <div className="rounded-lg border bg-white shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã dự án</TableHead>
              <TableHead>Tên dự án</TableHead>
              <TableHead>Tổ chức</TableHead>
              <TableHead>Giai đoạn</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Giám đốc DA</TableHead>
              <TableHead>Phòng ban</TableHead>
              <TableHead>Địa điểm</TableHead>
              <TableHead className="text-right">GFA (m²)</TableHead>
              <TableHead className="text-right">Ngân sách</TableHead>
              <TableHead className="text-center w-[90px]">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={colCount} className="text-center py-12">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : !projects?.length ? (
              <TableRow>
                <TableCell colSpan={colCount} className="text-center text-muted-foreground py-12">
                  Chưa có dự án nào
                </TableCell>
              </TableRow>
            ) : (
              projects.map((p) =>
                editingId === p.id && editRow ? (
                  <InlineEditRow
                    key={p.id}
                    row={editRow}
                    originalStatus={editingOriginalStatus}
                    onChange={handleFieldChange}
                    onSave={handleSave}
                    onCancel={cancelEdit}
                    saving={saving}
                    organizations={orgList}
                  />
                ) : (
                  <DisplayRow
                    key={p.id}
                    project={p}
                    onEdit={() => startEdit(p)}
                    onDelete={() => setDeleteTarget(p)}
                  />
                ),
              )
            )}
          </TableBody>
        </Table>
      </div>

      {deleteTarget && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !deleting) setDeleteTarget(null)
          }}
        >
          <DialogContent className="sm:max-w-[440px]">
            <DialogHeader>
              <DialogTitle>Xác nhận lưu trữ</DialogTitle>
              <DialogDescription>Bạn có chắc chắn muốn lưu trữ dự án này không?</DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border bg-gray-50 px-4 py-3">
              <p className="text-sm font-semibold text-gray-800">{deleteTarget.project_name}</p>
              <p className="text-xs text-gray-500">
                {deleteTarget.project_code} &middot; {deleteTarget.location ?? '—'}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Dự án sẽ được lưu trữ và không hiển thị trong danh sách. Dữ liệu không bị xóa khỏi hệ
              thống.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Hủy
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Lưu trữ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
