import { useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/shared/api/axios'
import {
  Plus,
  Loader2,
  Send,
  Check,
  TrendingUp,
  TrendingDown,
  Camera,
  FileWarning,
  ArrowUpDown,
  Activity,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
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
  useProjectHealth,
  useProgressReports,
  useCreateReport,
  useSubmitReport,
  useApproveReport,
  useVariationOrders,
  useCreateVO,
  useSubmitVO,
  useApproveVO,
} from '@/entities/project-monitoring'
import type { HealthStatus, VOType } from '@/entities/project-monitoring'
import { useWbsTree } from '@/entities/project'
import type { WbsNode } from '@/entities/project'

// ── Helpers ──

function vnd(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—'
  return Number(v).toLocaleString('vi-VN') + ' ₫'
}

const healthColors: Record<HealthStatus, { bg: string; text: string; border: string }> = {
  GREEN: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-300' },
  YELLOW: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' },
  RED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300' },
}

// ══════════════════════════════════════════
// HEALTH DASHBOARD (SPI/CPI Gauges)
// ══════════════════════════════════════════

function HealthDashboard({ projectId }: { projectId: string }) {
  const { data: health, isLoading } = useProjectHealth(projectId)

  if (isLoading)
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  if (!health)
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Chưa có dữ liệu EVM. Cần thiết lập CBS trước.
      </p>
    )

  const h = health
  const colors = healthColors[h.health_status]

  return (
    <div className="space-y-4">
      {/* Health banner */}
      <div className={`rounded-xl border-2 ${colors.border} ${colors.bg} p-4`}>
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full ${
              h.health_status === 'GREEN'
                ? 'bg-green-500'
                : h.health_status === 'YELLOW'
                  ? 'bg-amber-500'
                  : 'bg-red-500'
            }`}
          >
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className={`font-bold ${colors.text}`}>
              {h.health_status === 'GREEN'
                ? 'DỰ ÁN HOẠT ĐỘNG TỐT'
                : h.health_status === 'YELLOW'
                  ? 'CẦN THEO DÕI'
                  : 'CẢNH BÁO NGHIÊM TRỌNG'}
            </p>
            <p className="text-xs text-muted-foreground">{h.health_label}</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3">
        <GaugeCard
          label="SPI"
          sublabel="Tiến độ"
          value={h.spi}
          threshold={0.9}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <GaugeCard
          label="CPI"
          sublabel="Chi phí"
          value={h.cpi}
          threshold={0.9}
          icon={<TrendingDown className="h-4 w-4" />}
        />
        <div className="rounded-lg border p-3">
          <p className="text-[10px] font-medium text-muted-foreground uppercase">
            SV (Chênh lệch TĐ)
          </p>
          <p
            className={`text-lg font-bold ${h.schedule_variance >= 0 ? 'text-green-600' : 'text-red-600'}`}
          >
            {vnd(h.schedule_variance)}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-[10px] font-medium text-muted-foreground uppercase">
            CV (Chênh lệch CP)
          </p>
          <p
            className={`text-lg font-bold ${h.cost_variance >= 0 ? 'text-green-600' : 'text-red-600'}`}
          >
            {vnd(h.cost_variance)}
          </p>
        </div>
      </div>

      {/* EVM values */}
      <div className="grid grid-cols-4 gap-3 text-sm">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-[10px] text-muted-foreground uppercase">BAC (Ngân sách)</p>
          <p className="font-bold">{vnd(h.bac)}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-[10px] text-muted-foreground uppercase">EV (Giá trị đạt)</p>
          <p className="font-bold">{vnd(h.earned_value)}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-[10px] text-muted-foreground uppercase">AC (Chi phí TT)</p>
          <p className="font-bold">{vnd(h.actual_cost)}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-[10px] text-muted-foreground uppercase">EAC (Dự báo)</p>
          <p className={`font-bold ${h.eac > h.bac ? 'text-red-600' : 'text-green-600'}`}>
            {vnd(h.eac)}
          </p>
        </div>
      </div>
    </div>
  )
}

function GaugeCard({
  label,
  sublabel,
  value,
  threshold,
  icon,
}: {
  label: string
  sublabel: string
  value: number
  threshold: number
  icon: React.ReactNode
}) {
  const pct = Math.min(Math.max(value * 100, 0), 200)
  const isGood = value >= threshold
  return (
    <div className={`rounded-lg border p-3 ${isGood ? '' : 'border-red-200 bg-red-50/30'}`}>
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <span className="text-[10px] font-medium text-muted-foreground uppercase">
          {label} ({sublabel})
        </span>
      </div>
      <p className={`text-2xl font-bold ${isGood ? 'text-green-600' : 'text-red-600'}`}>{value}</p>
      <Progress value={pct / 2} className={`h-1.5 mt-1 ${isGood ? '' : '[&>div]:bg-red-500'}`} />
    </div>
  )
}

// ══════════════════════════════════════════
// PROGRESS REPORT SECTION
// ══════════════════════════════════════════

function ProgressReportSection({ projectId }: { projectId: string }) {
  const { data: reports, isLoading } = useProgressReports(projectId)
  const { data: wbsTree } = useWbsTree(projectId)
  const createMut = useCreateReport()
  const submitMut = useSubmitReport()
  const approveMut = useApproveReport()
  const [creating, setCreating] = useState(false)

  // Flatten WBS
  const flatWbs: { id: string; code: string; name: string; progress: number }[] = []
  function flatten(nodes: WbsNode[]) {
    for (const n of nodes) {
      flatWbs.push({ id: n.id, code: n.code, name: n.name, progress: Number(n.progress_percent) })
      if (n.children) flatten(n.children)
    }
  }
  if (wbsTree) flatten(wbsTree)

  const handleCreateReport = () => {
    if (flatWbs.length === 0) {
      toast.error('Cần có WBS để tạo báo cáo')
      return
    }
    setCreating(true)
    const today = new Date()
    const period = `W${String(Math.ceil(today.getDate() / 7)).padStart(2, '0')}-${today.getFullYear()}`

    createMut.mutate(
      {
        project_id: projectId,
        report_period: period,
        report_date: today.toISOString().split('T')[0],
        wbs_progress: flatWbs.map((w) => ({
          wbs_id: w.id,
          wbs_code: w.code,
          wbs_name: w.name,
          planned_percent: w.progress,
          actual_percent: w.progress,
        })),
        evidence_attachments: [],
      },
      {
        onSuccess: () =>
          toast.success('Tạo báo cáo tiến độ — Hãy cập nhật % và đính kèm ảnh hiện trường'),
        onError: (err: unknown) => toast.error(getErrorMessage(err)),
        onSettled: () => setCreating(false),
      },
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Báo cáo Tiến độ
          </h4>
          <div className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
            <Camera className="h-3 w-3" /> Bắt buộc ảnh hiện trường
          </div>
        </div>
        <Button size="sm" className="gap-1" onClick={handleCreateReport} disabled={creating}>
          {creating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          Cập nhật sản lượng
        </Button>
      </div>

      {isLoading ? (
        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
      ) : !reports?.length ? (
        <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
          Chưa có báo cáo tiến độ
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <div key={r.id} className="rounded-lg border p-3 hover:bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {r.report_period}
                  </Badge>
                  <Badge
                    variant={
                      r.status === 'APPROVED'
                        ? 'default'
                        : r.status === 'REJECTED'
                          ? 'destructive'
                          : 'secondary'
                    }
                    className="text-[10px]"
                  >
                    {r.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.report_date).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Evidence indicator */}
                  {r.evidence_attachments && r.evidence_attachments.length > 0 ? (
                    <span className="text-[10px] text-green-600 flex items-center gap-0.5">
                      <Camera className="h-3 w-3" /> {r.evidence_attachments.length} ảnh
                    </span>
                  ) : (
                    <span className="text-[10px] text-red-600 flex items-center gap-0.5">
                      <FileWarning className="h-3 w-3" /> Chưa có ảnh
                    </span>
                  )}
                  <span className="text-xs font-mono">
                    SPI:{r.spi} CPI:{r.cpi}
                  </span>

                  {r.status === 'DRAFT' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] gap-0.5"
                      onClick={() => {
                        submitMut.mutate(
                          { id: r.id },
                          {
                            onSuccess: () => toast.success('Đã gửi báo cáo'),
                            onError: (err: unknown) => toast.error(getErrorMessage(err)),
                          },
                        )
                      }}
                    >
                      <Send className="h-2.5 w-2.5" /> Gửi
                    </Button>
                  )}
                  {r.status === 'SUBMITTED' && (
                    <Button
                      size="sm"
                      className="h-6 text-[10px] gap-0.5 bg-green-600"
                      onClick={() => {
                        approveMut.mutate(
                          { id: r.id },
                          {
                            onSuccess: () => toast.success('Đã duyệt'),
                            onError: (err: unknown) => toast.error(getErrorMessage(err)),
                          },
                        )
                      }}
                    >
                      <Check className="h-2.5 w-2.5" /> Duyệt
                    </Button>
                  )}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span>
                  Tiến độ:{' '}
                  <span className="font-semibold text-gray-800">
                    {Number(r.overall_progress).toFixed(1)}%
                  </span>
                </span>
                <Progress value={Number(r.overall_progress)} className="h-1.5 w-24" />
                <span>EV: {vnd(r.earned_value)}</span>
                <span>AC: {vnd(r.actual_cost)}</span>
                {r.rejection_reason && (
                  <span className="text-red-500">Lý do: {r.rejection_reason}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════
// VARIATION ORDER SECTION
// ══════════════════════════════════════════

const voSchema = z.object({
  title: z.string().min(1, 'Tiêu đề bắt buộc'),
  description: z.string().optional(),
  vo_type: z.string().min(1, 'Chọn loại thay đổi'),
  budget_after: z.coerce.number().min(0).optional(),
  timeline_after: z.string().optional(),
  scope_description: z.string().optional(),
  reason: z.string().min(1, 'Lý do bắt buộc'),
})

function VOSection({ projectId }: { projectId: string }) {
  const { data: vos, isLoading } = useVariationOrders(projectId)
  const createMut = useCreateVO()
  const submitMut = useSubmitVO()
  const approveMut = useApproveVO()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(voSchema),
    defaultValues: {
      title: '',
      description: '',
      vo_type: '',
      budget_after: undefined as number | undefined,
      timeline_after: '',
      scope_description: '',
      reason: '',
    },
  })

  const onSubmit = (v: z.infer<typeof voSchema>) => {
    setSubmitting(true)
    createMut.mutate(
      { project_id: projectId, ...v, vo_type: v.vo_type as VOType },
      {
        onSuccess: () => {
          toast.success('Tạo VO thành công')
          reset()
          setDialogOpen(false)
        },
        onError: (err: unknown) => toast.error(getErrorMessage(err)),
        onSettled: () => setSubmitting(false),
      },
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Yêu cầu Thay đổi (VO)
        </h4>
        <Button size="sm" variant="outline" className="gap-1" onClick={() => setDialogOpen(true)}>
          <ArrowUpDown className="h-3.5 w-3.5" /> Tạo VO
        </Button>
      </div>

      {isLoading ? (
        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
      ) : !vos?.length ? (
        <div className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
          Chưa có yêu cầu thay đổi nào
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Mã VO</TableHead>
              <TableHead>Tiêu đề</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead className="text-right">Chênh lệch NS</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {vos.map((vo) => (
              <TableRow key={vo.id}>
                <TableCell className="font-mono text-xs">{vo.vo_code}</TableCell>
                <TableCell className="font-medium text-sm">{vo.title}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px]">
                    {vo.vo_type}
                  </Badge>
                </TableCell>
                <TableCell
                  className={`text-right font-mono text-sm ${(vo.budget_delta ?? 0) > 0 ? 'text-red-600' : 'text-green-600'}`}
                >
                  {vo.budget_delta !== null && vo.budget_delta !== undefined
                    ? `${vo.budget_delta > 0 ? '+' : ''}${vnd(vo.budget_delta)}`
                    : '—'}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      vo.status === 'APPROVED'
                        ? 'default'
                        : vo.status === 'REJECTED'
                          ? 'destructive'
                          : 'secondary'
                    }
                    className="text-[10px]"
                  >
                    {vo.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {vo.status === 'DRAFT' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px]"
                        onClick={() => {
                          submitMut.mutate(
                            { id: vo.id },
                            {
                              onSuccess: () => toast.success('VO đã gửi'),
                              onError: (e: unknown) => toast.error(getErrorMessage(e)),
                            },
                          )
                        }}
                      >
                        Gửi
                      </Button>
                    )}
                    {vo.status === 'SUBMITTED' && (
                      <Button
                        size="sm"
                        className="h-6 text-[10px] bg-green-600"
                        onClick={() => {
                          approveMut.mutate(
                            { id: vo.id },
                            {
                              onSuccess: () => toast.success('VO duyệt — NS đã cập nhật'),
                              onError: (e: unknown) => toast.error(getErrorMessage(e)),
                            },
                          )
                        }}
                      >
                        Duyệt
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Create VO Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          if (!submitting) {
            if (!o) reset()
            setDialogOpen(o)
          }
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Tạo Yêu cầu Thay đổi (VO)</DialogTitle>
            <DialogDescription>Điều chỉnh Ngân sách / Tiến độ / Phạm vi dự án</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Tiêu đề *</Label>
              <Input placeholder="Điều chỉnh ngân sách giai đoạn 2" {...register('title')} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Loại thay đổi *</Label>
                <Select onValueChange={(v) => setValue('vo_type', v, { shouldValidate: true })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUDGET">Ngân sách</SelectItem>
                    <SelectItem value="TIMELINE">Tiến độ</SelectItem>
                    <SelectItem value="SCOPE">Phạm vi</SelectItem>
                    <SelectItem value="COMBINED">Tổng hợp</SelectItem>
                  </SelectContent>
                </Select>
                {errors.vo_type && (
                  <p className="text-xs text-destructive">{errors.vo_type.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Ngân sách mới (VNĐ)</Label>
                <Input type="number" {...register('budget_after')} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Lý do thay đổi *</Label>
              <Input placeholder="Giải thích lý do điều chỉnh..." {...register('reason')} />
              {errors.reason && <p className="text-xs text-destructive">{errors.reason.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Mô tả</Label>
              <Input placeholder="Mô tả chi tiết..." {...register('description')} />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Tạo VO
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ══════════════════════════════════════════
// MAIN MONITORING TAB
// ══════════════════════════════════════════

export function MonitoringTab({ projectId }: { projectId: string }): React.JSX.Element {
  return (
    <div className="space-y-8">
      {/* Health Dashboard */}
      <HealthDashboard projectId={projectId} />

      {/* Progress Reports */}
      <div className="border-t pt-6">
        <ProgressReportSection projectId={projectId} />
      </div>

      {/* Variation Orders */}
      <div className="border-t pt-6">
        <VOSection projectId={projectId} />
      </div>
    </div>
  )
}
