import { useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage, api } from '@/shared/api/axios'
import {
  Plus,
  Loader2,
  Eye,
  Send,
  Check,
  X,
  FileDown,
  CircleCheck,
  CircleDot,
  Circle,
  CircleX,
  Rocket,
  Ban,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  useProjectRequests,
  useProjectRequest,
  useCreateProjectRequest,
  useSubmitRequest,
  useApproveDept,
  useApproveExec,
  useRejectRequest,
  STATUS_LABELS,
  WORKFLOW_STEPS,
  STATUS_STEP_MAP,
} from '@/entities/project-request'
import type { ProjectRequestStatus } from '@/entities/project-request'

// ── Helpers ──

function vnd(v: number | null | undefined): string {
  if (v == null) return '—'
  return Number(v).toLocaleString('vi-VN') + ' ₫'
}

const statusVariant: Record<
  ProjectRequestStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  DRAFT: 'outline',
  SUBMITTED: 'secondary',
  DEPT_APPROVED: 'secondary',
  EXEC_APPROVED: 'default',
  REJECTED: 'destructive',
  DEPLOYED: 'default',
  CANCELED: 'outline',
}

// ══════════════════════════════════════════
// STEPPER COMPONENT
// ══════════════════════════════════════════

function WorkflowStepper({ status }: { status: ProjectRequestStatus }) {
  const currentStep = STATUS_STEP_MAP[status]
  const isRejected = status === 'REJECTED'
  const isCanceled = status === 'CANCELED'
  const isDeployed = status === 'DEPLOYED'

  return (
    <div className="flex items-center gap-1">
      {WORKFLOW_STEPS.map((step, idx) => {
        const isCompleted = currentStep > idx || isDeployed
        const isCurrent = currentStep === idx && !isRejected && !isCanceled

        return (
          <div key={step.label} className="flex items-center gap-1">
            {/* Step circle */}
            <div
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                isCompleted
                  ? 'bg-green-100 text-green-700'
                  : isCurrent
                    ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-300'
                    : isRejected
                      ? 'bg-red-50 text-red-400'
                      : 'bg-gray-100 text-gray-400'
              }`}
            >
              {isCompleted ? (
                <CircleCheck className="h-3.5 w-3.5" />
              ) : isCurrent ? (
                <CircleDot className="h-3.5 w-3.5 animate-pulse" />
              ) : isRejected ? (
                <CircleX className="h-3.5 w-3.5" />
              ) : (
                <Circle className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">{step.label}</span>
            </div>

            {/* Connector line */}
            {idx < WORKFLOW_STEPS.length - 1 && (
              <div className={`h-0.5 w-6 ${isCompleted ? 'bg-green-300' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}

      {/* Final: Deployed */}
      {isDeployed && (
        <>
          <div className="h-0.5 w-6 bg-green-300" />
          <div className="flex items-center gap-1.5 rounded-full bg-green-600 px-2.5 py-1 text-xs font-medium text-white">
            <Rocket className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Đã triển khai</span>
          </div>
        </>
      )}

      {isRejected && (
        <div className="ml-2 flex items-center gap-1 text-xs text-red-600 font-medium">
          <Ban className="h-3.5 w-3.5" /> Từ chối
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════
// CREATE DIALOG
// ══════════════════════════════════════════

const createSchema = z.object({
  title: z.string().min(1, 'Tiêu đề bắt buộc'),
  description: z.string().optional(),
  proposed_project_code: z.string().min(1, 'Mã dự án bắt buộc'),
  proposed_project_name: z.string().min(1, 'Tên dự án bắt buộc'),
  location: z.string().optional(),
  gfa_m2: z.coerce.number().min(0).optional(),
  budget: z.coerce.number().min(0).optional(),
})

function CreateRequestDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const createMut = useCreateProjectRequest()
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
      proposed_project_code: '',
      proposed_project_name: '',
      location: '',
      gfa_m2: undefined as number | undefined,
      budget: undefined as number | undefined,
    },
  })

  const onSubmit = (v: z.infer<typeof createSchema>) => {
    setSubmitting(true)
    createMut.mutate(v, {
      onSuccess: () => {
        toast.success('Tạo yêu cầu thành công')
        reset()
        onOpenChange(false)
      },
      onError: (err: unknown) => toast.error(getErrorMessage(err, 'Tạo thất bại')),
      onSettled: () => setSubmitting(false),
    })
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
      <DialogContent className="sm:max-w-[580px]">
        <DialogHeader>
          <DialogTitle>Tạo Tờ trình Dự án</DialogTitle>
          <DialogDescription>
            Đề xuất dự án mới. Sau khi tạo, gửi đề xuất để bắt đầu quy trình phê duyệt.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>Tiêu đề tờ trình *</Label>
            <Input placeholder="Đề xuất dự án Khu đô thị ABC" {...register('title')} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Nội dung / Mô tả</Label>
            <Input placeholder="Mô tả chi tiết tờ trình..." {...register('description')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Mã dự án đề xuất *</Label>
              <Input placeholder="PRJ-025" {...register('proposed_project_code')} />
              {errors.proposed_project_code && (
                <p className="text-xs text-destructive">{errors.proposed_project_code.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Tên dự án *</Label>
              <Input placeholder="Khu đô thị ABC" {...register('proposed_project_name')} />
              {errors.proposed_project_name && (
                <p className="text-xs text-destructive">{errors.proposed_project_name.message}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Địa điểm</Label>
              <Input placeholder="Hà Nội" {...register('location')} />
            </div>
            <div className="space-y-1">
              <Label>GFA (m²)</Label>
              <Input type="number" step="0.01" {...register('gfa_m2')} />
            </div>
            <div className="space-y-1">
              <Label>Ngân sách (VNĐ)</Label>
              <Input type="number" step="1" placeholder="50000000000" {...register('budget')} />
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
// DETAIL DIALOG (View + Actions)
// ══════════════════════════════════════════

function RequestDetailDialog({
  requestId,
  open,
  onOpenChange,
}: {
  requestId: string
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { data: request, isLoading } = useProjectRequest(requestId)
  const submitMut = useSubmitRequest()
  const approveDeptMut = useApproveDept()
  const approveExecMut = useApproveExec()
  const rejectMut = useRejectRequest()
  const [comment, setComment] = useState('')
  const [acting, setActing] = useState(false)

  const doAction = (mut: ReturnType<typeof useSubmitRequest>, successMsg: string) => {
    setActing(true)
    mut.mutate(
      { id: requestId, comment: comment || undefined },
      {
        onSuccess: () => {
          toast.success(successMsg)
          setComment('')
        },
        onError: (err: unknown) => toast.error(getErrorMessage(err, 'Thao tác thất bại')),
        onSettled: () => setActing(false),
      },
    )
  }

  const handleExportExcel = async () => {
    try {
      const response = await api.get(`/project-requests/${requestId}/excel/export`, {
        responseType: 'blob',
      })
      const blob = new Blob([response.data as BlobPart], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `ToTrinh_${requestId.slice(0, 8)}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('Xuất tờ trình thành công')
    } catch {
      toast.error('Xuất thất bại')
    }
  }

  if (isLoading || !request) {
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

  const r = request
  const canSubmit = r.status === 'DRAFT'
  const canApproveDept = r.status === 'SUBMITTED'
  const canApproveExec = r.status === 'DEPT_APPROVED'
  const canReject = r.status === 'SUBMITTED' || r.status === 'DEPT_APPROVED'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {r.request_code} — {r.title}
            <Badge variant={statusVariant[r.status]}>{STATUS_LABELS[r.status]}</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="py-3 border-b">
          <WorkflowStepper status={r.status} />
        </div>

        {/* Info */}
        <div className="grid grid-cols-2 gap-4 py-3 text-sm">
          <div>
            <span className="text-muted-foreground">Mã DA:</span>{' '}
            <span className="font-medium">{r.proposed_project_code}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Tên DA:</span>{' '}
            <span className="font-medium">{r.proposed_project_name}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Địa điểm:</span> {r.location ?? '—'}
          </div>
          <div>
            <span className="text-muted-foreground">GFA:</span>{' '}
            {r.gfa_m2 ? `${Number(r.gfa_m2).toLocaleString('vi-VN')} m²` : '—'}
          </div>
          <div>
            <span className="text-muted-foreground">Ngân sách:</span>{' '}
            <span className="font-semibold">{vnd(r.budget)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Người đề xuất:</span>{' '}
            {r.created_by_name ?? r.created_by}
          </div>
          {r.description && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Nội dung:</span> {r.description}
            </div>
          )}
          {r.rejection_reason && (
            <div className="col-span-2 rounded bg-red-50 border border-red-200 px-3 py-2 text-red-700">
              <span className="font-semibold">Lý do từ chối:</span> {r.rejection_reason}
            </div>
          )}
          {r.deployed_project_id && (
            <div className="col-span-2 rounded bg-green-50 border border-green-200 px-3 py-2 text-green-700">
              <span className="font-semibold">Dự án đã tạo:</span>{' '}
              {r.deployed_project_id.slice(0, 8)}...
            </div>
          )}
        </div>

        {/* Workflow logs */}
        {r.workflow_logs && r.workflow_logs.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase">
              Lịch sử phê duyệt
            </p>
            <div className="space-y-1.5">
              {r.workflow_logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 text-xs">
                  <div
                    className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${
                      log.action === 'APPROVE' || log.action === 'DEPLOY'
                        ? 'bg-green-500'
                        : log.action === 'REJECT'
                          ? 'bg-red-500'
                          : 'bg-blue-500'
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
        {(canSubmit || canApproveDept || canApproveExec || canReject) && (
          <div className="space-y-3 border-t pt-3">
            <Input
              placeholder="Ghi chú / Lý do (bắt buộc khi từ chối)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="h-8 text-sm"
            />
            <div className="flex gap-2 flex-wrap">
              {canSubmit && (
                <Button
                  size="sm"
                  className="gap-1"
                  onClick={() => doAction(submitMut, 'Đã gửi đề xuất')}
                  disabled={acting}
                >
                  <Send className="h-3 w-3" /> Gửi đề xuất
                </Button>
              )}
              {canApproveDept && (
                <Button
                  size="sm"
                  className="gap-1 bg-green-600 hover:bg-green-700"
                  onClick={() => doAction(approveDeptMut, 'Trưởng BP đã duyệt')}
                  disabled={acting}
                >
                  <Check className="h-3 w-3" /> Trưởng BP Duyệt
                </Button>
              )}
              {canApproveExec && (
                <Button
                  size="sm"
                  className="gap-1 bg-green-600 hover:bg-green-700"
                  onClick={() => doAction(approveExecMut, 'Ban ĐH duyệt — Dự án đã tạo')}
                  disabled={acting}
                >
                  <Check className="h-3 w-3" /> Ban ĐH Duyệt
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
                    doAction(rejectMut, 'Đã từ chối')
                  }}
                  disabled={acting}
                >
                  <X className="h-3 w-3" /> Từ chối
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="gap-1 ml-auto"
                onClick={() => void handleExportExcel()}
              >
                <FileDown className="h-3 w-3" /> Xuất tờ trình
              </Button>
            </div>
          </div>
        )}

        {/* Export only for completed/deployed */}
        {!canSubmit && !canApproveDept && !canApproveExec && !canReject && (
          <div className="flex justify-end border-t pt-3">
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => void handleExportExcel()}
            >
              <FileDown className="h-3 w-3" /> Xuất tờ trình Excel
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ══════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════

export function ProjectRequestsPage(): React.JSX.Element {
  const { data: requests, isLoading } = useProjectRequests()
  const [createOpen, setCreateOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quản lý Yêu cầu Dự án</h1>
          <p className="text-sm text-muted-foreground">
            Tờ trình đề xuất & phê duyệt dự án theo quy trình ERP xây dựng
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Tạo tờ trình
        </Button>
      </div>

      <CreateRequestDialog open={createOpen} onOpenChange={setCreateOpen} />

      {/* Stepper legend */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-semibold">Quy trình:</span>
        <WorkflowStepper status="DRAFT" />
      </div>

      <div className="rounded-lg border bg-white shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Mã YC</TableHead>
              <TableHead>Tiêu đề</TableHead>
              <TableHead>Mã DA</TableHead>
              <TableHead className="text-right">Ngân sách</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Tiến trình</TableHead>
              <TableHead>Người đề xuất</TableHead>
              <TableHead className="w-[80px]">Ngày</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </TableCell>
              </TableRow>
            ) : !requests?.length ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                  Chưa có yêu cầu nào
                </TableCell>
              </TableRow>
            ) : (
              requests.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => setDetailId(r.id)}
                >
                  <TableCell className="font-mono text-xs">{r.request_code}</TableCell>
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.proposed_project_code}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{vnd(r.budget)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[r.status]} className="text-[10px]">
                      {STATUS_LABELS[r.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <WorkflowStepper status={r.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.created_by_name ?? '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString('vi-VN')}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDetailId(r.id)
                      }}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {detailId && (
        <RequestDetailDialog
          requestId={detailId}
          open={!!detailId}
          onOpenChange={(o) => {
            if (!o) setDetailId(null)
          }}
        />
      )}
    </div>
  )
}
