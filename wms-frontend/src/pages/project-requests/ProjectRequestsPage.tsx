import { useState, useEffect, useRef } from 'react'
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
  Pencil,
  AlertTriangle,
  RotateCcw,
  Trash2,
  Paperclip,
  Upload,
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
  useUpdateProjectRequest,
  useDeleteProjectRequest,
  useSubmitRequest,
  useApproveDept,
  useApproveExec,
  useRejectRequest,
  useRequestInfo,
  useResubmitRequest,
  STATUS_LABELS,
  WORKFLOW_STEPS,
  STATUS_STEP_MAP,
} from '@/entities/project-request'
import type {
  ProjectRequest,
  ProjectRequestStatus,
  RequestAttachment,
} from '@/entities/project-request'
import { useAuthStore } from '@/features/auth'

// ── Helpers ──

function vnd(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—'
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
  PENDING_INFO: 'secondary',
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

      {status === 'PENDING_INFO' && (
        <div className="ml-2 flex items-center gap-1 text-xs text-amber-700 font-medium">
          <AlertTriangle className="h-3.5 w-3.5" /> Yêu cầu bổ sung
        </div>
      )}

      {isCanceled && (
        <div className="ml-2 flex items-center gap-1 text-xs text-muted-foreground font-medium">
          <Ban className="h-3.5 w-3.5" /> Đã hủy
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
// EDIT DIALOG
// ══════════════════════════════════════════

function EditRequestDialog({
  request,
  open,
  onOpenChange,
}: {
  request: ProjectRequest
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const updateMut = useUpdateProjectRequest()
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createSchema),
    defaultValues: {
      title: request.title,
      description: request.description ?? '',
      proposed_project_code: request.proposed_project_code,
      proposed_project_name: request.proposed_project_name,
      location: request.location ?? '',
      gfa_m2: request.gfa_m2 ?? undefined,
      budget: request.budget ?? undefined,
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        title: request.title,
        description: request.description ?? '',
        proposed_project_code: request.proposed_project_code,
        proposed_project_name: request.proposed_project_name,
        location: request.location ?? '',
        gfa_m2: request.gfa_m2 ?? undefined,
        budget: request.budget ?? undefined,
      })
    }
  }, [open, request, reset])

  const onSubmit = (v: z.infer<typeof createSchema>) => {
    setSubmitting(true)
    updateMut.mutate(
      { id: request.id, ...v },
      {
        onSuccess: () => {
          toast.success('Cap nhat thanh cong')
          onOpenChange(false)
        },
        onError: (err: unknown) => toast.error(getErrorMessage(err, 'Cap nhat that bai')),
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
      <DialogContent className="sm:max-w-[580px]">
        <DialogHeader>
          <DialogTitle>Chinh sua Yeu cau: {request.request_code}</DialogTitle>
          <DialogDescription>
            Chi cho phep sua khi trang thai la Ban nhap (DRAFT).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>Tieu de to trinh *</Label>
            <Input {...register('title')} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Noi dung / Mo ta</Label>
            <Input {...register('description')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Ma du an de xuat *</Label>
              <Input {...register('proposed_project_code')} />
              {errors.proposed_project_code && (
                <p className="text-xs text-destructive">{errors.proposed_project_code.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Ten du an *</Label>
              <Input {...register('proposed_project_name')} />
              {errors.proposed_project_name && (
                <p className="text-xs text-destructive">{errors.proposed_project_name.message}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Dia diem</Label>
              <Input {...register('location')} />
            </div>
            <div className="space-y-1">
              <Label>GFA (m2)</Label>
              <Input type="number" step="0.01" {...register('gfa_m2')} />
            </div>
            <div className="space-y-1">
              <Label>Ngan sach (VND)</Label>
              <Input type="number" step="1" {...register('budget')} />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Huy
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Luu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ══════════════════════════════════════════
// DELETE CONFIRM DIALOG
// ══════════════════════════════════════════

function DeleteConfirmDialog({
  request,
  open,
  onOpenChange,
}: {
  request: ProjectRequest
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const deleteMut = useDeleteProjectRequest()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = () => {
    setDeleting(true)
    deleteMut.mutate(request.id, {
      onSuccess: () => {
        toast.success(`Da xoa yeu cau ${request.request_code}`)
        onOpenChange(false)
      },
      onError: (err: unknown) => toast.error(getErrorMessage(err, 'Xoa that bai')),
      onSettled: () => setDeleting(false),
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!deleting) onOpenChange(o)
      }}
    >
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Xac nhan xoa</DialogTitle>
          <DialogDescription>
            Ban co chac muon xoa yeu cau <strong>{request.request_code}</strong> — &quot;
            {request.title}&quot;? Hanh dong nay khong the hoan tac.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            Huy
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Xoa
          </Button>
        </DialogFooter>
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

  const requestInfoMut = useRequestInfo()

  const resubmitMut = useResubmitRequest()
  const [comment, setComment] = useState('')
  const [acting, setActing] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files) setUploadFiles((prev) => [...prev, ...Array.from(e.target.files!)])
  }
  const removeFile = (idx: number): void =>
    setUploadFiles((prev) => prev.filter((_, i) => i !== idx))

  const uploadAllFiles = async (role: string): Promise<void> => {
    for (const file of uploadFiles) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'project-requests')
      try {
        const res = await api.post('/upload/cloudinary', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        const fileUrl = (res.data as { data: { secure_url: string } }).data.secure_url
        await api.post(`/project-requests/${requestId}/attachments`, {
          file_url: fileUrl,
          file_name: file.name,
          file_size: file.size,
          uploaded_by_role: role,
        })
      } catch {
        toast.error('Tải lên thất bại')
      }
    }
  }

  const handleApproveWithFiles = async (): Promise<void> => {
    setActing(true)
    try {
      if (uploadFiles.length > 0) {
        setUploading(true)
        await uploadAllFiles('APPROVER')
        setUploading(false)
      }
      const mut = canApproveDept ? approveDeptMut : approveExecMut
      const msg = canApproveDept ? 'Trưởng BP đã duyệt' : 'Ban ĐH duyệt'
      mut.mutate(
        { id: requestId, comment: comment || undefined },
        {
          onSuccess: () => {
            toast.success(msg)
            setComment('')
            setUploadFiles([])
          },
          onError: (err: unknown) => toast.error(getErrorMessage(err, 'Duyệt thất bại')),
          onSettled: () => setActing(false),
        },
      )
    } catch {
      setActing(false)
      setUploading(false)
    }
  }

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
  const canRequestInfo = r.status === 'SUBMITTED' || r.status === 'DEPT_APPROVED'
  const canResubmit = r.status === 'PENDING_INFO'

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
          {r.status === 'PENDING_INFO' && (
            <div className="col-span-2 rounded bg-amber-50 border border-amber-200 px-3 py-2 text-amber-800">
              <span className="font-semibold">Yêu cầu bổ sung:</span> Người duyệt yêu cầu bổ sung
              thông tin. Vui lòng cập nhật và gửi lại.
            </div>
          )}
          {r.attachments && r.attachments.length > 0 && (
            <div className="col-span-2 space-y-1">
              <span className="text-muted-foreground font-semibold text-xs">Đính kèm:</span>
              <div className="flex flex-wrap gap-2">
                {r.attachments.map((att: RequestAttachment) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-1 text-xs border rounded px-2 py-1"
                  >
                    <FileDown className="h-3 w-3" />
                    <span>{att.file_name}</span>
                    {att.uploaded_by_role === 'APPROVER' && (
                      <Badge
                        variant="secondary"
                        className="text-[9px] ml-1 bg-blue-100 text-blue-700"
                      >
                        BP Duyệt bổ sung
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {r.rejection_reason && (
            <div className="col-span-2 rounded bg-red-50 border border-red-200 px-3 py-2 text-red-700">
              <span className="font-semibold">Lý do từ chối:</span> {r.rejection_reason}
            </div>
          )}
          {r.status === 'PENDING_INFO' && (
            <div className="col-span-2 rounded bg-amber-50 border border-amber-200 px-3 py-2 text-amber-800">
              <span className="font-semibold">⚠️ Yêu cầu bổ sung:</span> Người duyệt yêu cầu bổ sung
              thông tin. Vui lòng cập nhật và gửi lại.
            </div>
          )}
          {r.attachments && r.attachments.length > 0 && (
            <div className="col-span-2 space-y-1">
              <span className="text-muted-foreground font-semibold text-xs">Đính kèm:</span>
              <div className="flex flex-wrap gap-2">
                {r.attachments.map((att: RequestAttachment) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-1 text-xs border rounded px-2 py-1"
                  >
                    <FileDown className="h-3 w-3" />
                    <span>{att.file_name}</span>
                    {att.uploaded_by_role === 'APPROVER' && (
                      <Badge
                        variant="secondary"
                        className="text-[9px] ml-1 bg-blue-100 text-blue-700"
                      >
                        BP Duyệt bổ sung
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
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
                          : log.action === 'REQUEST_INFO'
                            ? 'bg-amber-500'
                            : log.action === 'RESUBMIT'
                              ? 'bg-cyan-500'
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
        {(canSubmit ||
          canApproveDept ||
          canApproveExec ||
          canReject ||
          canRequestInfo ||
          canResubmit) && (
          <div className="space-y-3 border-t pt-3">
            <Input
              placeholder="Ghi chú / Lý do (bắt buộc khi từ chối)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="h-8 text-sm"
            />
            {(canApproveDept || canApproveExec) && (
              <div className="space-y-2">
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (e.dataTransfer.files)
                      setUploadFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)])
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <Paperclip className="h-5 w-5 mx-auto text-gray-400 mb-1" />
                  <p className="text-xs text-muted-foreground">
                    Kéo thả hoặc bấm để tải lên chứng từ bổ sung
                  </p>
                </div>
                {uploadFiles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {uploadFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1 text-xs border rounded px-2 py-1 bg-blue-50"
                      >
                        <Upload className="h-3 w-3 text-blue-600" />
                        <span className="max-w-[150px] truncate">{file.name}</span>
                        <button
                          type="button"
                          className="text-red-400 hover:text-red-600 ml-1"
                          onClick={() => removeFile(idx)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

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
                  onClick={() =>
                    uploadFiles.length > 0
                      ? void handleApproveWithFiles()
                      : doAction(approveDeptMut, 'Trưởng BP đã duyệt')
                  }
                  disabled={acting}
                >
                  {uploading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                  {uploadFiles.length > 0 ? ' Duyệt & Đính kèm' : ' Trưởng BP Duyệt'}
                </Button>
              )}
              {canApproveExec && (
                <Button
                  size="sm"
                  className="gap-1 bg-green-600 hover:bg-green-700"
                  onClick={() =>
                    uploadFiles.length > 0
                      ? void handleApproveWithFiles()
                      : doAction(approveExecMut, 'Ban ĐH duyệt — Dự án đã tạo')
                  }
                  disabled={acting}
                >
                  {uploading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                  {uploadFiles.length > 0 ? ' Duyệt & Đính kèm' : ' Ban ĐH Duyệt'}
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
              {canRequestInfo && (
                <Button
                  size="sm"
                  className="gap-1 bg-amber-500 hover:bg-amber-600 text-white"
                  onClick={() => {
                    if (!comment.trim()) {
                      toast.error('Vui lòng nhập lý do yêu cầu bổ sung')
                      return
                    }

                    doAction(requestInfoMut, 'Đã yêu cầu bổ sung thông tin')
                  }}
                  disabled={acting}
                >
                  <AlertTriangle className="h-3 w-3" /> Yêu cầu bổ sung
                </Button>
              )}
              {canResubmit && (
                <Button
                  size="sm"
                  className="gap-1 bg-cyan-600 hover:bg-cyan-700 text-white"
                  onClick={() => {
                    setActing(true)

                    resubmitMut.mutate(
                      { id: requestId },
                      {
                        onSuccess: () => {
                          toast.success('Đã cập nhật và gửi lại')
                          setComment('')
                        },
                        onError: (err: unknown) =>
                          toast.error(getErrorMessage(err, 'Gửi lại thất bại')),
                        onSettled: () => setActing(false),
                      },
                    )
                  }}
                  disabled={acting}
                >
                  <RotateCcw className="h-3 w-3" /> Cập nhật & Gửi lại
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
        {!canSubmit &&
          !canApproveDept &&
          !canApproveExec &&
          !canReject &&
          !canRequestInfo &&
          !canResubmit && (
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
  const user = useAuthStore((s) => s.user)
  const [createOpen, setCreateOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [editRequest, setEditRequest] = useState<ProjectRequest | null>(null)
  const [deleteRequest, setDeleteRequest] = useState<ProjectRequest | null>(null)

  const canEditDelete = (r: ProjectRequest) =>
    r.status === 'DRAFT' && (user?.role === 'ADMIN' || user?.id === r.created_by)

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
              <TableHead className="w-[100px] text-center">Thao tác</TableHead>
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
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Xem chi tiết"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDetailId(r.id)
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {canEditDelete(r) && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-blue-600 hover:text-blue-700"
                            title="Sửa"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditRequest(r)
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            title="Xóa"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteRequest(r)
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
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

      {editRequest && (
        <EditRequestDialog
          request={editRequest}
          open={!!editRequest}
          onOpenChange={(o) => {
            if (!o) setEditRequest(null)
          }}
        />
      )}

      {deleteRequest && (
        <DeleteConfirmDialog
          request={deleteRequest}
          open={!!deleteRequest}
          onOpenChange={(o) => {
            if (!o) setDeleteRequest(null)
          }}
        />
      )}
    </div>
  )
}
