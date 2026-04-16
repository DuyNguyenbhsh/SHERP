import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/shared/api/axios'
import { Plus, Loader2, Trash2, Link2, Shield, Lock, Users } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell as TCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useScheduleData,
  useScheduleBaselines,
  useCreateScheduleTask,
  useDeleteScheduleTask,
  useCreateScheduleLink,
  useDeleteScheduleLink,
  useCreateBaseline,
  useApproveBaseline,
} from '@/entities/project-schedule'
import type { ProjectTaskItem } from '@/entities/project-schedule'

// ── Helpers ──

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}

function daysBetween(a: string, b: string): number {
  return Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000)
}

// ══════════════════════════════════════════
// GANTT CHART (Recharts BarChart)
// ══════════════════════════════════════════

function GanttChart({ tasks, criticalIds }: { tasks: ProjectTaskItem[]; criticalIds: string[] }) {
  const criticalSet = useMemo(() => new Set(criticalIds), [criticalIds])

  // Tìm ngày bắt đầu sớm nhất để normalize
  const minDate = useMemo(() => {
    let min = Infinity
    for (const t of tasks) {
      if (t.start_date) min = Math.min(min, new Date(t.start_date).getTime())
    }
    return min === Infinity ? 0 : min
  }, [tasks])

  const chartData = useMemo(
    () =>
      tasks.map((t) => {
        const startOffset = t.start_date
          ? daysBetween(new Date(minDate).toISOString(), t.start_date)
          : 0
        return {
          name: `${t.task_code} ${t.name}`,
          id: t.id,
          start: Math.max(0, startOffset),
          duration: t.duration_days,
          isCritical: criticalSet.has(t.id),
          float: t.total_float ?? 0,
          progress: Number(t.progress_percent),
          labor: t.planned_labor,
        }
      }),
    [tasks, minDate, criticalSet],
  )

  if (tasks.length === 0) return null

  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">
        Biểu đồ Gantt — Đường Găng (đỏ)
      </p>
      <ResponsiveContainer width="100%" height={Math.max(tasks.length * 36 + 40, 200)}>
        <BarChart data={chartData} layout="vertical" barSize={18} margin={{ left: 10, right: 30 }}>
          <XAxis
            type="number"
            label={{ value: 'Ngày', position: 'insideBottomRight', offset: -5 }}
            tick={{ fontSize: 10 }}
          />
          <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 10 }} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[1]) return null
              const entry = payload[1] as { payload: (typeof chartData)[0] }
              const d = entry.payload
              return (
                <div className="rounded bg-white border shadow-lg px-3 py-2 text-xs">
                  <p className="font-semibold">{d.name}</p>
                  <p>
                    Bắt đầu ngày: {d.start} | Thời gian: {d.duration} ngày
                  </p>
                  <p>
                    Float: {d.float} ngày | Nhân công: {d.labor}
                  </p>
                  <p>Tiến độ: {d.progress}%</p>
                  {d.isCritical && <p className="text-red-600 font-semibold">ĐƯỜNG GĂNG</p>}
                </div>
              )
            }}
          />
          {/* Invisible bar for offset */}
          <Bar dataKey="start" stackId="a" fill="transparent" />
          {/* Visible bar for duration */}
          <Bar dataKey="duration" stackId="a" radius={[2, 2, 2, 2]}>
            {chartData.map((entry) => (
              <Cell
                key={entry.id}
                fill={entry.isCritical ? '#ef4444' : '#3b82f6'}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-4 mt-2 text-[10px]">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded bg-red-500" /> Đường Găng (Critical Path)
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded bg-blue-500" /> Task bình thường
        </span>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════
// RESOURCE SUMMARY
// ══════════════════════════════════════════

function ResourceSummary({ tasks }: { tasks: ProjectTaskItem[] }) {
  const totalLabor = tasks.reduce((s, t) => s + t.planned_labor, 0)
  const peakLabor = useMemo(() => {
    // Simple peak calculation
    const dayMap = new Map<number, number>()
    for (const t of tasks) {
      if (
        t.early_start !== null &&
        t.early_start !== undefined &&
        t.early_finish !== null &&
        t.early_finish !== undefined &&
        t.planned_labor > 0
      ) {
        for (let d = t.early_start; d < t.early_finish; d++) {
          dayMap.set(d, (dayMap.get(d) ?? 0) + t.planned_labor)
        }
      }
    }
    return dayMap.size > 0 ? Math.max(...dayMap.values()) : 0
  }, [tasks])

  return (
    <div className="flex items-center gap-4 text-xs">
      <div className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5">
        <Users className="h-3.5 w-3.5 text-blue-500" />
        <span className="text-muted-foreground">Tổng nhân công:</span>
        <span className="font-bold">{totalLabor}</span>
      </div>
      <div className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5">
        <Users className="h-3.5 w-3.5 text-amber-500" />
        <span className="text-muted-foreground">Đỉnh nhân công:</span>
        <span className="font-bold">{peakLabor} người/ngày</span>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════
// CREATE TASK DIALOG
// ══════════════════════════════════════════

const taskSchema = z.object({
  task_code: z.string().min(1, 'Mã task bắt buộc'),
  name: z.string().min(1, 'Tên bắt buộc'),
  duration_days: z.coerce.number().min(1, 'Ít nhất 1 ngày'),
  start_date: z.string().optional(),
  planned_labor: z.coerce.number().min(0).optional(),
  resource_notes: z.string().optional(),
  description: z.string().optional(),
})

function CreateTaskDialog({
  open,
  onOpenChange,
  projectId,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  projectId: string
}) {
  const createMut = useCreateScheduleTask()
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      task_code: '',
      name: '',
      duration_days: 7,
      start_date: '',
      planned_labor: 0,
      resource_notes: '',
      description: '',
    },
  })

  const onSubmit = (v: z.infer<typeof taskSchema>) => {
    setSubmitting(true)
    createMut.mutate(
      { project_id: projectId, ...v },
      {
        onSuccess: () => {
          toast.success('Tạo task + tính lại CPM')
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
          <DialogTitle>Thêm Task Thi công</DialogTitle>
          <DialogDescription>CPM sẽ tự động tính lại lịch trình sau khi thêm.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Mã task *</Label>
              <Input placeholder="T-001" {...register('task_code')} />
              {errors.task_code && (
                <p className="text-xs text-destructive">{errors.task_code.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Thời gian (ngày) *</Label>
              <Input type="number" {...register('duration_days')} />
              {errors.duration_days && (
                <p className="text-xs text-destructive">{errors.duration_days.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Tên task *</Label>
            <Input placeholder="Đào móng khu A" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Ngày bắt đầu</Label>
              <Input type="date" {...register('start_date')} />
            </div>
            <div className="space-y-1">
              <Label>Nhân công (người)</Label>
              <Input type="number" {...register('planned_labor')} />
            </div>
            <div className="space-y-1">
              <Label>Thiết bị</Label>
              <Input placeholder="Cẩu, máy xúc..." {...register('resource_notes')} />
            </div>
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

// ══════════════════════════════════════════
// CREATE LINK DIALOG
// ══════════════════════════════════════════

function CreateLinkDialog({
  open,
  onOpenChange,
  projectId,
  tasks,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  projectId: string
  tasks: ProjectTaskItem[]
}) {
  const createMut = useCreateScheduleLink()
  const [predId, setPredId] = useState('')
  const [succId, setSuccId] = useState('')
  const [lag, setLag] = useState('0')
  const [submitting, setSubmitting] = useState(false)

  const handleCreate = () => {
    if (!predId || !succId) {
      toast.error('Chọn cả 2 task')
      return
    }
    setSubmitting(true)
    createMut.mutate(
      {
        project_id: projectId,
        predecessor_id: predId,
        successor_id: succId,
        lag_days: parseInt(lag) || 0,
      },
      {
        onSuccess: () => {
          toast.success('Tạo mối quan hệ + tính lại CPM')
          setPredId('')
          setSuccId('')
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
        if (!submitting) onOpenChange(o)
      }}
    >
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Tạo mối quan hệ FS (Finish-to-Start)</DialogTitle>
          <DialogDescription>
            Task B chờ Task A hoàn thành. Hệ thống tự kiểm tra vòng lặp.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>Task tiền nhiệm (A — phải xong trước)</Label>
            <Select value={predId} onValueChange={setPredId}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn task A" />
              </SelectTrigger>
              <SelectContent>
                {tasks.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.task_code} — {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Task kế nhiệm (B — chờ A xong)</Label>
            <Select value={succId} onValueChange={setSuccId}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn task B" />
              </SelectTrigger>
              <SelectContent>
                {tasks
                  .filter((t) => t.id !== predId)
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.task_code} — {t.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Lag (ngày chờ thêm sau khi A xong)</Label>
            <Input type="number" value={lag} onChange={(e) => setLag(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleCreate} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Tạo Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ══════════════════════════════════════════
// MAIN GANTT TAB
// ══════════════════════════════════════════

export function GanttTab({ projectId }: { projectId: string }): React.JSX.Element {
  const { data: schedule, isLoading } = useScheduleData(projectId)
  const { data: baselines } = useScheduleBaselines(projectId)
  const deleteMut = useDeleteScheduleTask()
  const deleteLinkMut = useDeleteScheduleLink()
  const createBaselineMut = useCreateBaseline()
  const approveBaselineMut = useApproveBaseline()
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)

  if (isLoading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )

  const tasks = schedule?.tasks ?? []
  const links = schedule?.links ?? []
  const criticalIds = schedule?.critical_path_ids ?? []
  const criticalSet = new Set(criticalIds)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Quản lý Tiến độ — PROJ3 (CPM/Gantt)
          </h3>
          <p className="text-xs text-muted-foreground">
            {criticalIds.length > 0 && (
              <span className="text-red-600 font-semibold">
                {criticalIds.length} task trên Đường Găng
              </span>
            )}
            {criticalIds.length > 0 && ' | '}
            {tasks.length} tasks | {links.length} links
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ResourceSummary tasks={tasks} />
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => setLinkDialogOpen(true)}
          >
            <Link2 className="h-3.5 w-3.5" /> Tạo Link
          </Button>
          <Button size="sm" className="gap-1" onClick={() => setTaskDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Thêm Task
          </Button>
        </div>
      </div>

      {/* Gantt Chart */}
      <GanttChart tasks={tasks} criticalIds={criticalIds} />

      {/* Task Table */}
      {tasks.length > 0 && (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 text-[10px]">
                <TableHead className="w-[70px]">Mã</TableHead>
                <TableHead>Tên task</TableHead>
                <TableHead className="w-[60px] text-right">TG (ngày)</TableHead>
                <TableHead className="w-[80px]">Bắt đầu</TableHead>
                <TableHead className="w-[80px]">Kết thúc</TableHead>
                <TableHead className="w-[50px] text-right">ES</TableHead>
                <TableHead className="w-[50px] text-right">EF</TableHead>
                <TableHead className="w-[50px] text-right">Float</TableHead>
                <TableHead className="w-[60px] text-right">NC</TableHead>
                <TableHead className="w-[50px]">Găng</TableHead>
                <TableHead className="w-[40px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((t) => (
                <TableRow key={t.id} className={criticalSet.has(t.id) ? 'bg-red-50/40' : ''}>
                  <TCell className="font-mono text-xs">{t.task_code}</TCell>
                  <TCell className="font-medium text-sm">{t.name}</TCell>
                  <TCell className="text-right text-sm">{t.duration_days}</TCell>
                  <TCell className="text-xs">{fmtDate(t.start_date)}</TCell>
                  <TCell className="text-xs">{fmtDate(t.end_date)}</TCell>
                  <TCell className="text-right text-xs text-muted-foreground">
                    {t.early_start ?? '—'}
                  </TCell>
                  <TCell className="text-right text-xs text-muted-foreground">
                    {t.early_finish ?? '—'}
                  </TCell>
                  <TCell
                    className={`text-right text-xs font-semibold ${(t.total_float ?? 0) === 0 ? 'text-red-600' : 'text-green-600'}`}
                  >
                    {t.total_float ?? '—'}
                  </TCell>
                  <TCell className="text-right text-xs">
                    {t.planned_labor > 0 ? t.planned_labor : '—'}
                  </TCell>
                  <TCell>
                    {criticalSet.has(t.id) && (
                      <Badge variant="destructive" className="text-[8px] h-4">
                        CP
                      </Badge>
                    )}
                  </TCell>
                  <TCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-gray-400 hover:text-red-500"
                      onClick={() =>
                        deleteMut.mutate(
                          { id: t.id, project_id: projectId },
                          { onSuccess: () => toast.success('Đã xóa') },
                        )
                      }
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {tasks.length === 0 && (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          Chưa có task nào. Nhấn "Thêm Task" để bắt đầu lập tiến độ.
        </div>
      )}

      {/* Links Table */}
      {links.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase">
            Mối quan hệ ({links.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {links.map((l) => {
              const pred = tasks.find((t) => t.id === l.predecessor_id)
              const succ = tasks.find((t) => t.id === l.successor_id)
              return (
                <div
                  key={l.id}
                  className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px]"
                >
                  <span className="font-mono font-semibold">{pred?.task_code ?? '?'}</span>
                  <span className="text-muted-foreground">
                    → FS{l.lag_days > 0 ? `+${l.lag_days}d` : ''} →
                  </span>
                  <span className="font-mono font-semibold">{succ?.task_code ?? '?'}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-1 text-gray-400 hover:text-red-500"
                    onClick={() =>
                      deleteLinkMut.mutate(
                        { id: l.id, project_id: projectId },
                        { onSuccess: () => toast.success('Xóa link') },
                      )
                    }
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Baselines */}
      <div className="border-t pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Baseline Tiến độ</p>
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => {
              createBaselineMut.mutate(
                {
                  project_id: projectId,
                  title: `Baseline ${new Date().toLocaleDateString('vi-VN')}`,
                },
                {
                  onSuccess: () => toast.success('Tạo baseline snapshot'),
                  onError: (e: unknown) => toast.error(getErrorMessage(e)),
                },
              )
            }}
          >
            <Shield className="h-3.5 w-3.5" /> Tạo Baseline
          </Button>
        </div>

        {baselines && baselines.length > 0 ? (
          <div className="space-y-2">
            {baselines.map((b) => (
              <div
                key={b.id}
                className={`rounded-lg border p-3 ${b.frozen_at ? 'border-green-300 bg-green-50/30' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold">v{b.version}</span>
                    <span className="text-sm">{b.title}</span>
                    <Badge
                      variant={b.status === 'APPROVED' ? 'default' : 'outline'}
                      className="text-[10px]"
                    >
                      {b.status}
                    </Badge>
                    {b.frozen_at && <Lock className="h-3.5 w-3.5 text-amber-500" />}
                  </div>
                  {b.status !== 'APPROVED' && !b.frozen_at && (
                    <Button
                      size="sm"
                      className="h-6 text-[10px] bg-green-600 gap-0.5"
                      onClick={() => {
                        approveBaselineMut.mutate(
                          { id: b.id },
                          {
                            onSuccess: () => toast.success('Baseline phê duyệt — Freeze'),
                            onError: (e: unknown) => toast.error(getErrorMessage(e)),
                          },
                        )
                      }}
                    >
                      <Shield className="h-2.5 w-2.5" /> Phê duyệt
                    </Button>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {b.snapshot_data.tasks.length} tasks | {b.snapshot_data.critical_path_ids.length}{' '}
                  critical | {b.snapshot_data.total_duration_days} ngày
                  {b.approved_by_name && ` | Duyệt bởi ${b.approved_by_name}`}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Chưa có baseline. Tạo baseline để lưu snapshot tiến độ.
          </p>
        )}
      </div>

      {/* Dialogs */}
      <CreateTaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        projectId={projectId}
      />
      <CreateLinkDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        projectId={projectId}
        tasks={tasks}
      />
    </div>
  )
}
