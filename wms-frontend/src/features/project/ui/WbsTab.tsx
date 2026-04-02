import { useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/shared/api/axios'
import {
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  Loader2,
  Calendar,
  AlertTriangle,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useWbsTree, useCreateWbs, useDeleteWbs, useUpdateWbsProgress } from '@/entities/project'
import type { WbsNode, WbsStatus } from '@/entities/project'

const statusLabel: Record<WbsStatus, string> = {
  PENDING: 'Chờ',
  IN_PROGRESS: 'Đang TH',
  COMPLETED: 'Xong',
  CANCELED: 'Hủy',
}
const statusVariant: Record<WbsStatus, 'outline' | 'default' | 'secondary' | 'destructive'> = {
  PENDING: 'outline',
  IN_PROGRESS: 'default',
  COMPLETED: 'secondary',
  CANCELED: 'destructive',
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}

function isLate(node: WbsNode): boolean {
  if (node.status === 'COMPLETED' || node.status === 'CANCELED') return false
  if (!node.planned_end) return false
  return new Date(node.planned_end) < new Date()
}

function getProgressColor(node: WbsNode): string {
  if (node.status === 'COMPLETED') return 'bg-green-500'
  if (isLate(node)) return 'bg-red-500'
  if (Number(node.progress_percent) >= 80) return 'bg-green-500'
  if (Number(node.progress_percent) >= 50) return 'bg-blue-500'
  return 'bg-green-400'
}

function getProgressBg(node: WbsNode): string {
  if (isLate(node)) return 'bg-red-100'
  return 'bg-gray-100'
}

// ── Recursive WBS Tree Row ──

function WbsTreeRow({
  node,
  projectId,
  depth = 0,
}: {
  node: WbsNode
  projectId: string
  depth?: number
}) {
  const [expanded, setExpanded] = useState(depth < 2)
  const [editingProgress, setEditingProgress] = useState(false)
  const [progress, setProgress] = useState(String(node.progress_percent))
  const deleteWbs = useDeleteWbs()
  const updateProgress = useUpdateWbsProgress()

  const hasChildren = node.children && node.children.length > 0
  const indent = depth * 20
  const late = isLate(node)

  return (
    <>
      <TableRow className={`group hover:bg-muted/30 ${late ? 'bg-red-50/30' : ''}`}>
        {/* Mã + Expand */}
        <TableCell className="py-1.5">
          <div className="flex items-center" style={{ paddingLeft: `${indent}px` }}>
            <button
              className="w-5 h-5 flex items-center justify-center shrink-0 mr-1"
              onClick={() => setExpanded(!expanded)}
            >
              {hasChildren ? (
                expanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )
              ) : (
                <span className="w-3.5" />
              )}
            </button>
            <span className="font-mono text-xs text-muted-foreground">{node.code}</span>
          </div>
        </TableCell>

        {/* Tên hạng mục */}
        <TableCell className="py-1.5">
          <div className="flex items-center gap-1.5">
            <span
              className={`text-sm font-medium ${depth === 0 ? 'text-gray-900' : 'text-gray-700'}`}
            >
              {node.name}
            </span>
            {late && <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
          </div>
        </TableCell>

        {/* Trạng thái */}
        <TableCell className="py-1.5">
          <Badge variant={statusVariant[node.status]} className="text-[10px] h-5">
            {statusLabel[node.status]}
          </Badge>
        </TableCell>

        {/* Tiến độ - Progress Bar */}
        <TableCell className="py-1.5">
          {editingProgress ? (
            <form
              className="flex items-center gap-1"
              onSubmit={(e) => {
                e.preventDefault()
                updateProgress.mutate(
                  { wbs_id: node.id, project_id: projectId, progress_percent: Number(progress) },
                  {
                    onSuccess: () => {
                      setEditingProgress(false)
                      toast.success('Cập nhật tiến độ')
                    },
                    onError: (err: unknown) => toast.error(getErrorMessage(err)),
                  },
                )
              }}
            >
              <Input
                type="number"
                min={0}
                max={100}
                step={1}
                value={progress}
                onChange={(e) => setProgress(e.target.value)}
                className="h-6 w-14 text-xs"
              />
              <Button type="submit" size="sm" variant="ghost" className="h-6 px-1.5 text-xs">
                OK
              </Button>
            </form>
          ) : (
            <button
              className="flex items-center gap-2 w-full min-w-[120px]"
              onClick={() => setEditingProgress(true)}
              title="Click để sửa tiến độ"
            >
              <div className={`h-2.5 flex-1 rounded-full ${getProgressBg(node)} overflow-hidden`}>
                <div
                  className={`h-full rounded-full transition-all ${getProgressColor(node)}`}
                  style={{ width: `${Math.min(Number(node.progress_percent), 100)}%` }}
                />
              </div>
              <span
                className={`text-xs font-semibold w-9 text-right ${late ? 'text-red-600' : 'text-gray-600'}`}
              >
                {Number(node.progress_percent)}%
              </span>
            </button>
          )}
        </TableCell>

        {/* W% (Trọng số) */}
        <TableCell className="py-1.5 text-right">
          <span className="text-xs text-muted-foreground">{Number(node.weight)}%</span>
        </TableCell>

        {/* KH Bắt đầu - Kết thúc */}
        <TableCell className="py-1.5">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 shrink-0" />
            <span>{fmtDate(node.planned_start)}</span>
            <span>→</span>
            <span className={late && node.planned_end ? 'text-red-600 font-semibold' : ''}>
              {fmtDate(node.planned_end)}
            </span>
          </div>
        </TableCell>

        {/* TT Bắt đầu - Kết thúc */}
        <TableCell className="py-1.5">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {node.actual_start || node.actual_end ? (
              <>
                <span>{fmtDate(node.actual_start)}</span>
                <span>→</span>
                <span>{fmtDate(node.actual_end)}</span>
              </>
            ) : (
              <span>—</span>
            )}
          </div>
        </TableCell>

        {/* Actions */}
        <TableCell className="py-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"
            onClick={() =>
              deleteWbs.mutate(
                { wbs_id: node.id, project_id: projectId },
                { onSuccess: () => toast.success('Đã xóa') },
              )
            }
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </TableCell>
      </TableRow>

      {/* Children rows */}
      {expanded &&
        hasChildren &&
        node.children.map((child) => (
          <WbsTreeRow key={child.id} node={child} projectId={projectId} depth={depth + 1} />
        ))}
    </>
  )
}

// ── Create WBS Dialog ──

const wbsSchema = z.object({
  code: z.string().min(1, 'Mã WBS bắt buộc'),
  name: z.string().min(1, 'Tên hạng mục bắt buộc'),
  parent_id: z.string().optional(),
  weight: z.coerce.number().min(0).max(100).optional(),
  planned_start: z.string().optional(),
  planned_end: z.string().optional(),
  description: z.string().optional(),
})

function CreateWbsDialog({
  open,
  onOpenChange,
  projectId,
  wbsNodes,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  projectId: string
  wbsNodes: WbsNode[]
}) {
  const createWbs = useCreateWbs()
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(wbsSchema),
    defaultValues: {
      code: '',
      name: '',
      parent_id: '',
      weight: 0,
      planned_start: '',
      planned_end: '',
      description: '',
    },
  })

  const flatNodes: { id: string; label: string }[] = []
  function flatten(nodes: WbsNode[], prefix = '') {
    for (const n of nodes) {
      flatNodes.push({ id: n.id, label: `${prefix}${n.code} — ${n.name}` })
      if (n.children) flatten(n.children, prefix + '  ')
    }
  }
  flatten(wbsNodes)

  const onSubmit = (v: z.infer<typeof wbsSchema>) => {
    setSubmitting(true)
    createWbs.mutate(
      {
        project_id: projectId,
        code: v.code,
        name: v.name,
        parent_id: v.parent_id || undefined,
        weight: v.weight,
        planned_start: v.planned_start || undefined,
        planned_end: v.planned_end || undefined,
        description: v.description || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Tạo WBS thành công')
          reset()
          onOpenChange(false)
        },
        onError: (err: unknown) => toast.error(getErrorMessage(err)),
        onSettled: () => setSubmitting(false),
      },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!submitting) {
          if (!o) reset()
          onOpenChange(o)
        }
      }}
    >
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Thêm hạng mục WBS</DialogTitle>
          <DialogDescription>Tạo node trong cây WBS dự án</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Mã WBS *</Label>
              <Input placeholder="1.2.1" {...register('code')} />
              {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Trọng số (%)</Label>
              <Input type="number" step="0.01" {...register('weight')} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Tên hạng mục *</Label>
            <Input placeholder="Thi công móng cọc" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>WBS cha (để trống = root)</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              onChange={(e) => setValue('parent_id', e.target.value)}
            >
              <option value="">— Root (Gốc) —</option>
              {flatNodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Kế hoạch bắt đầu</Label>
              <Input type="date" {...register('planned_start')} />
            </div>
            <div className="space-y-1">
              <Label>Kế hoạch kết thúc</Label>
              <Input type="date" {...register('planned_end')} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Mô tả</Label>
            <Input placeholder="Mô tả công việc..." {...register('description')} />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Tạo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main WBS Tab (Tree-Table) ──

export function WbsTab({ projectId }: { projectId: string }): React.JSX.Element {
  const { data: wbsTree, isLoading } = useWbsTree(projectId)
  const [createOpen, setCreateOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Tính thống kê
  let totalNodes = 0
  let completedNodes = 0
  let lateNodes = 0
  function countNodes(nodes: WbsNode[]) {
    for (const n of nodes) {
      totalNodes++
      if (n.status === 'COMPLETED') completedNodes++
      if (isLate(n)) lateNodes++
      if (n.children) countNodes(n.children)
    }
  }
  if (wbsTree) countNodes(wbsTree)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Cấu trúc WBS ({wbsTree?.length ?? 0} node gốc)
          </h3>
          {totalNodes > 0 && (
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                {completedNodes} hoàn thành
              </span>
              {lateNodes > 0 && (
                <span className="flex items-center gap-1 text-red-600 font-medium">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  {lateNodes} trễ hạn
                </span>
              )}
              <span className="text-muted-foreground">{totalNodes} tổng</span>
            </div>
          )}
        </div>
        <Button size="sm" className="gap-1" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Thêm WBS
        </Button>
      </div>

      {!wbsTree?.length ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-muted-foreground">
          <p className="text-sm">Chưa có cấu trúc WBS. Thêm hạng mục để bắt đầu.</p>
          <p className="text-xs mt-1">VD: Cọc → Móng → Thân → Hoàn thiện</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-[140px]">Mã WBS</TableHead>
                <TableHead>Hạng mục</TableHead>
                <TableHead className="w-[80px]">Trạng thái</TableHead>
                <TableHead className="w-[180px]">Tiến độ</TableHead>
                <TableHead className="w-[60px] text-right">W%</TableHead>
                <TableHead className="w-[140px]">KH (Bắt đầu → KT)</TableHead>
                <TableHead className="w-[120px]">TT (Bắt đầu → KT)</TableHead>
                <TableHead className="w-[40px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {wbsTree.map((node) => (
                <WbsTreeRow key={node.id} node={node} projectId={projectId} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateWbsDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={projectId}
        wbsNodes={wbsTree ?? []}
      />
    </div>
  )
}
