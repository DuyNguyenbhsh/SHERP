import { useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage, api } from '@/shared/api/axios'
import {
  Plus,
  Loader2,
  Send,
  Check,
  X,
  Eye,
  FileDown,
  Lock,
  Shield,
  CircleCheck,
  CircleDot,
  Circle,
  CircleX,
  Clock,
  GitBranch,
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
  useProjectPlans,
  useProjectPlan,
  useCreatePlan,
  useSubmitPlan,
  useReviewPlan,
  useApprovePlan,
  useRejectPlan,
  PLAN_STATUS_LABELS,
  PLAN_WORKFLOW_STEPS,
  PLAN_STEP_MAP,
} from '@/entities/project-plan'
import type { PlanStatus } from '@/entities/project-plan'

// ── Helpers ──

function vnd(v: number | null | undefined): string {
  if (v == null) return '—'
  return Number(v).toLocaleString('vi-VN') + ' ₫'
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('vi-VN')
}

const statusVariant: Record<PlanStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  DRAFT: 'outline',
  SUBMITTED: 'secondary',
  REVIEWED: 'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive',
}

// ══════════════════════════════════════════
// PROJ1 TIMELINE STEPPER
// ══════════════════════════════════════════

function PlanTimeline({ status }: { status: PlanStatus }) {
  const currentStep = PLAN_STEP_MAP[status]
  const isRejected = status === 'REJECTED'
  const isApproved = status === 'APPROVED'

  return (
    <div className="flex items-center gap-0">
      {PLAN_WORKFLOW_STEPS.map((step, idx) => {
        const isCompleted = currentStep > idx || isApproved
        const isCurrent = currentStep === idx && !isRejected

        return (
          <div key={step.label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all ${
                  isCompleted
                    ? 'border-green-500 bg-green-500 text-white'
                    : isCurrent
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : isRejected
                        ? 'border-red-300 bg-red-50 text-red-400'
                        : 'border-gray-200 bg-white text-gray-400'
                }`}
              >
                {isCompleted ? (
                  <CircleCheck className="h-5 w-5" />
                ) : isCurrent ? (
                  <CircleDot className="h-5 w-5 animate-pulse" />
                ) : isRejected ? (
                  <CircleX className="h-5 w-5" />
                ) : (
                  <Circle className="h-5 w-5" />
                )}
              </div>
              <span
                className={`mt-1.5 text-[10px] font-medium text-center leading-tight ${
                  isCompleted
                    ? 'text-green-700'
                    : isCurrent
                      ? 'text-blue-700 font-semibold'
                      : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
              <span className="text-[9px] text-muted-foreground">{step.description}</span>
            </div>
            {idx < PLAN_WORKFLOW_STEPS.length - 1 && (
              <div
                className={`h-0.5 w-10 -mt-5 mx-1 ${isCompleted ? 'bg-green-400' : 'bg-gray-200'}`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ══════════════════════════════════════════
// CREATE PLAN DIALOG
// ══════════════════════════════════════════

const createSchema = z.object({
  title: z.string().min(1, 'Tiêu đề bắt buộc'),
  description: z.string().optional(),
  planned_start: z.string().optional(),
  planned_end: z.string().optional(),
  total_budget: z.coerce.number().min(0).optional(),
})

function CreatePlanDialog({
  open,
  onOpenChange,
  projectId,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  projectId: string
}) {
  const createMut = useCreatePlan()
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createSchema),
    defaultValues: {
      title: '',
      description: '',
      planned_start: '',
      planned_end: '',
      total_budget: undefined as number | undefined,
    },
  })

  const onSubmit = (v: z.infer<typeof createSchema>) => {
    setSubmitting(true)
    createMut.mutate(
      { project_id: projectId, ...v },
      {
        onSuccess: () => {
          toast.success('Tạo kế hoạch thành công')
          reset()
          onOpenChange(false)
        },
        onError: (err: unknown) => toast.error(getErrorMessage(err, 'Tạo thất bại')),
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
          <DialogTitle>Lập Kế hoạch Thi công</DialogTitle>
          <DialogDescription>
            Tạo phiên bản kế hoạch mới. Sau khi tạo, trình duyệt để bắt đầu quy trình phê duyệt
            PROJ1.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>Tiêu đề *</Label>
            <Input placeholder="Kế hoạch thi công Giai đoạn 1" {...register('title')} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Mô tả</Label>
            <Input placeholder="Nội dung kế hoạch thi công..." {...register('description')} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Bắt đầu KH</Label>
              <Input type="date" {...register('planned_start')} />
            </div>
            <div className="space-y-1">
              <Label>Kết thúc KH</Label>
              <Input type="date" {...register('planned_end')} />
            </div>
            <div className="space-y-1">
              <Label>Ngân sách (VNĐ)</Label>
              <Input type="number" {...register('total_budget')} />
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
// PLAN DETAIL DIALOG
// ══════════════════════════════════════════

function PlanDetailDialog({
  planId,
  open,
  onOpenChange,
}: {
  planId: string
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { data: plan, isLoading } = useProjectPlan(planId)
  const submitMut = useSubmitPlan()
  const reviewMut = useReviewPlan()
  const approveMut = useApprovePlan()
  const rejectMut = useRejectPlan()
  const [comment, setComment] = useState('')
  const [acting, setActing] = useState(false)

  const doAction = (mut: ReturnType<typeof useSubmitPlan>, msg: string) => {
    setActing(true)
    mut.mutate(
      { id: planId, comment: comment || undefined },
      {
        onSuccess: () => {
          toast.success(msg)
          setComment('')
        },
        onError: (err: unknown) => toast.error(getErrorMessage(err, 'Thao tác thất bại')),
        onSettled: () => setActing(false),
      },
    )
  }

  const handleExport = async () => {
    try {
      const response = await api.get(`/project-plans/${planId}/excel/export`, {
        responseType: 'blob',
      })
      const blob = new Blob([response.data as BlobPart], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `KeHoach_v${plan?.version ?? ''}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('Xuất kế hoạch thành công')
    } catch {
      toast.error('Xuất thất bại')
    }
  }

  if (isLoading || !plan) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const p = plan
  const isFrozen = !!p.frozen_at
  const canSubmit = p.status === 'DRAFT'
  const canReview = p.status === 'SUBMITTED'
  const canApprove = p.status === 'REVIEWED'
  const canReject = p.status === 'SUBMITTED' || p.status === 'REVIEWED'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            v{p.version} — {p.title}
            <Badge variant={statusVariant[p.status]}>{PLAN_STATUS_LABELS[p.status]}</Badge>
            {p.is_baseline && (
              <Badge className="bg-emerald-600 text-white gap-1">
                <Shield className="h-3 w-3" /> Baseline
              </Badge>
            )}
            {isFrozen && (
              <Badge variant="outline" className="gap-1 text-amber-700 border-amber-300">
                <Lock className="h-3 w-3" /> Read-only
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* PROJ1 Timeline */}
        <div className="py-4 border-b flex justify-center">
          <PlanTimeline status={p.status} />
        </div>

        {/* Frozen banner */}
        {isFrozen && (
          <div className="rounded-lg border-2 border-amber-300 bg-amber-50 px-4 py-3 flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Dữ liệu bị khóa vĩnh viễn</p>
              <p className="text-xs text-amber-600">
                Phê duyệt lúc {fmtDate(p.frozen_at)}. Tất cả số liệu và file đính kèm không thể
                chỉnh sửa, kể cả Admin.
              </p>
            </div>
          </div>
        )}

        {/* Plan info */}
        <div className="grid grid-cols-2 gap-3 py-3 text-sm">
          <div>
            <span className="text-muted-foreground">KH Bắt đầu:</span> {fmtDate(p.planned_start)}
          </div>
          <div>
            <span className="text-muted-foreground">KH Kết thúc:</span> {fmtDate(p.planned_end)}
          </div>
          <div>
            <span className="text-muted-foreground">Ngân sách:</span>{' '}
            <span className="font-semibold">{vnd(p.total_budget)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Người tạo:</span>{' '}
            {p.created_by_name ?? p.created_by}
          </div>
          {p.description && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Mô tả:</span> {p.description}
            </div>
          )}
          {p.rejection_reason && (
            <div className="col-span-2 rounded bg-red-50 border border-red-200 px-3 py-2 text-red-700 text-xs">
              <span className="font-semibold">Lý do từ chối:</span> {p.rejection_reason}
            </div>
          )}
          {p.previous_version_id && (
            <div className="col-span-2 rounded bg-blue-50 border border-blue-200 px-3 py-2 text-blue-700 text-xs">
              <GitBranch className="inline h-3 w-3 mr-1" />
              Clone từ phiên bản trước (đã bị từ chối)
            </div>
          )}
        </div>

        {/* Approval logs */}
        {p.approval_logs && p.approval_logs.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase">
              Lịch sử phê duyệt
            </p>
            <div className="space-y-1.5">
              {p.approval_logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 text-xs">
                  <div
                    className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${
                      log.action === 'APPROVE'
                        ? 'bg-green-500'
                        : log.action === 'REJECT'
                          ? 'bg-red-500'
                          : log.action === 'CLONE'
                            ? 'bg-blue-500'
                            : 'bg-gray-500'
                    }`}
                  />
                  <div>
                    <span className="font-medium">{log.acted_by_name ?? log.acted_by}</span>
                    {log.actor_role && (
                      <span className="text-muted-foreground"> ({log.actor_role})</span>
                    )}
                    <span className="text-muted-foreground"> — {log.action}</span>
                    <span className="text-muted-foreground ml-2">
                      {new Date(log.acted_at).toLocaleString('vi-VN')}
                    </span>
                    {log.comment && (
                      <p className="text-muted-foreground mt-0.5 italic">"{log.comment}"</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {(canSubmit || canReview || canApprove || canReject) && (
          <div className="space-y-3 border-t pt-3">
            <Input
              placeholder="Ghi chú (bắt buộc khi từ chối)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="h-8 text-sm"
            />
            <div className="flex gap-2 flex-wrap">
              {canSubmit && (
                <Button
                  size="sm"
                  className="gap-1"
                  onClick={() => doAction(submitMut, 'Đã trình duyệt')}
                  disabled={acting}
                >
                  <Send className="h-3 w-3" /> Trình duyệt
                </Button>
              )}
              {canReview && (
                <Button
                  size="sm"
                  className="gap-1 bg-blue-600 hover:bg-blue-700"
                  onClick={() => doAction(reviewMut, 'Đã xem xét')}
                  disabled={acting}
                >
                  <Eye className="h-3 w-3" /> Xem xét (PM)
                </Button>
              )}
              {canApprove && (
                <Button
                  size="sm"
                  className="gap-1 bg-green-600 hover:bg-green-700"
                  onClick={() => doAction(approveMut, 'Đã phê duyệt — Baseline')}
                  disabled={acting}
                >
                  <Check className="h-3 w-3" /> Phê duyệt (Baseline)
                </Button>
              )}
              {canReject && (
                <Button
                  size="sm"
                  variant="destructive"
                  className="gap-1"
                  onClick={() => {
                    if (!comment.trim()) {
                      toast.error('Vui lòng nhập lý do từ chối')
                      return
                    }
                    doAction(rejectMut, 'Đã từ chối — Phiên bản mới đã tạo')
                  }}
                  disabled={acting}
                >
                  <X className="h-3 w-3" /> Từ chối
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Export (always visible) */}
        <div className="flex justify-end border-t pt-3">
          <Button size="sm" variant="outline" className="gap-1" onClick={() => void handleExport()}>
            <FileDown className="h-3 w-3" /> Xuất Excel (Lưu hồ sơ)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ══════════════════════════════════════════
// MAIN PLAN TAB
// ══════════════════════════════════════════

export function PlanTab({ projectId }: { projectId: string }): React.JSX.Element {
  const { data: plans, isLoading } = useProjectPlans(projectId)
  const [createOpen, setCreateOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  const baseline = plans?.find((p) => p.is_baseline)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Kế hoạch Thi công — PROJ1
          </h3>
          <p className="text-xs text-muted-foreground">
            Quy trình: Soạn thảo → Trình duyệt → Xem xét → Phê duyệt (Baseline)
          </p>
        </div>
        <Button size="sm" className="gap-1" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Lập kế hoạch mới
        </Button>
      </div>

      {/* Baseline card */}
      {baseline && (
        <div className="rounded-xl border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              <span className="font-bold text-green-800">
                Baseline hiện tại — v{baseline.version}
              </span>
              <Lock className="h-4 w-4 text-amber-500" />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => setDetailId(baseline.id)}
            >
              <Eye className="h-3 w-3" /> Chi tiết
            </Button>
          </div>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Tiêu đề:</span>
              <br />
              <span className="font-medium">{baseline.title}</span>
            </div>
            <div>
              <span className="text-muted-foreground">KH Bắt đầu:</span>
              <br />
              {fmtDate(baseline.planned_start)}
            </div>
            <div>
              <span className="text-muted-foreground">KH Kết thúc:</span>
              <br />
              {fmtDate(baseline.planned_end)}
            </div>
            <div>
              <span className="text-muted-foreground">Ngân sách:</span>
              <br />
              <span className="font-semibold">{vnd(baseline.total_budget)}</span>
            </div>
          </div>
          <p className="mt-2 text-xs text-green-600">
            Phê duyệt bởi {baseline.approved_by_name ?? '—'} | {fmtDate(baseline.frozen_at)} |
            Read-only vĩnh viễn
          </p>
        </div>
      )}

      {/* Version list */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase">
          Lịch sử phiên bản ({plans?.length ?? 0})
        </p>

        {!plans?.length ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-muted-foreground">
            <Clock className="mb-2 h-8 w-8" />
            <p className="text-sm">Chưa có kế hoạch thi công nào</p>
            <p className="text-xs mt-1">Nhấn "Lập kế hoạch mới" để bắt đầu</p>
          </div>
        ) : (
          <div className="space-y-2">
            {plans.map((p) => (
              <div
                key={p.id}
                className={`rounded-lg border p-4 cursor-pointer hover:bg-muted/30 transition-colors ${
                  p.is_baseline
                    ? 'border-green-300 bg-green-50/30'
                    : p.status === 'REJECTED'
                      ? 'border-red-200 bg-red-50/20 opacity-60'
                      : p.status === 'DRAFT'
                        ? 'border-blue-200'
                        : ''
                }`}
                onClick={() => setDetailId(p.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold">v{p.version}</span>
                    <Badge variant={statusVariant[p.status]} className="text-[10px]">
                      {PLAN_STATUS_LABELS[p.status]}
                    </Badge>
                    {p.is_baseline && (
                      <Badge className="bg-emerald-600 text-white text-[10px] gap-0.5">
                        <Shield className="h-2.5 w-2.5" /> Baseline
                      </Badge>
                    )}
                    {p.frozen_at && <Lock className="h-3.5 w-3.5 text-amber-500" />}
                  </div>
                  <PlanTimeline status={p.status} />
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{p.title}</span>
                  <span>
                    {fmtDate(p.planned_start)} → {fmtDate(p.planned_end)}
                  </span>
                  <span>{vnd(p.total_budget)}</span>
                  <span>{p.created_by_name ?? '—'}</span>
                  <span>{fmtDate(p.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreatePlanDialog open={createOpen} onOpenChange={setCreateOpen} projectId={projectId} />
      {detailId && (
        <PlanDetailDialog
          planId={detailId}
          open={!!detailId}
          onOpenChange={(o) => {
            if (!o) setDetailId(null)
          }}
        />
      )}
    </div>
  )
}
