import { useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/shared/api/axios'
import { Check, X, Loader2, Clock, CircleCheck, CircleX, Circle, MessageSquare } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useApprovalsByEntity, useApproveStep, useRejectStep } from '@/entities/approval'
import type {
  ApprovalRequest,
  ApprovalStep,
  ApprovalRequestStatus,
  ApprovalStepStatus,
} from '@/entities/project'
import { useAuthStore } from '@/features/auth/model/auth.store'

const requestStatusLabel: Record<ApprovalRequestStatus, string> = {
  PENDING: 'Chờ phê duyệt',
  IN_PROGRESS: 'Đang phê duyệt',
  APPROVED: 'Đã phê duyệt',
  REJECTED: 'Từ chối',
  CANCELED: 'Đã hủy',
}

const requestStatusColor: Record<ApprovalRequestStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 border-blue-200',
  APPROVED: 'bg-green-100 text-green-800 border-green-200',
  REJECTED: 'bg-red-100 text-red-800 border-red-200',
  CANCELED: 'bg-gray-100 text-gray-600 border-gray-200',
}

const stepIcon: Record<ApprovalStepStatus, React.ReactNode> = {
  PENDING: <Clock className="h-4 w-4 text-gray-400" />,
  APPROVED: <CircleCheck className="h-4 w-4 text-green-500" />,
  REJECTED: <CircleX className="h-4 w-4 text-red-500" />,
  SKIPPED: <Circle className="h-4 w-4 text-gray-300" />,
}

const stepStatusLabel: Record<ApprovalStepStatus, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  SKIPPED: 'Bỏ qua',
}

// Map step_order to role labels (matching Central Cons convention)
const STEP_ROLE_LABELS: Record<number, string> = {
  1: 'PM (Giám đốc DA)',
  2: 'GDDA (Giám đốc Điều hành)',
  3: 'GDTC (Giám đốc Tài chính)',
}

interface ApprovalTimelineProps {
  entityType: string
  entityId: string
}

function StepCard({ step, request }: { step: ApprovalStep; request: ApprovalRequest }) {
  const user = useAuthStore((s) => s.user)
  const approveMut = useApproveStep()
  const rejectMut = useRejectStep()
  const [comment, setComment] = useState('')
  const [acting, setActing] = useState(false)

  const isCurrentStep = request.status === 'IN_PROGRESS' && step.step_order === request.current_step
  const canAct = isCurrentStep && step.status === 'PENDING' && user?.id === step.approver_id

  const handleApprove = () => {
    setActing(true)
    approveMut.mutate(
      { step_id: step.id, comment: comment || undefined },
      {
        onSuccess: () => {
          toast.success('Phê duyệt thành công')
          setComment('')
        },
        onError: (err: unknown) => toast.error(getErrorMessage(err, 'Phê duyệt thất bại')),
        onSettled: () => setActing(false),
      },
    )
  }

  const handleReject = () => {
    if (!comment.trim()) {
      toast.error('Vui lòng nhập lý do từ chối')
      return
    }
    setActing(true)
    rejectMut.mutate(
      { step_id: step.id, comment },
      {
        onSuccess: () => {
          toast.success('Đã từ chối')
          setComment('')
        },
        onError: (err: unknown) => toast.error(getErrorMessage(err, 'Từ chối thất bại')),
        onSettled: () => setActing(false),
      },
    )
  }

  const roleLabel = STEP_ROLE_LABELS[step.step_order] ?? `Bước ${step.step_order}`

  return (
    <div className={`relative flex gap-3 ${isCurrentStep ? '' : ''}`}>
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
            step.status === 'APPROVED'
              ? 'border-green-400 bg-green-50'
              : step.status === 'REJECTED'
                ? 'border-red-400 bg-red-50'
                : isCurrentStep
                  ? 'border-blue-400 bg-blue-50 animate-pulse'
                  : 'border-gray-200 bg-gray-50'
          }`}
        >
          {stepIcon[step.status]}
        </div>
        <div className="w-0.5 flex-1 bg-gray-200" />
      </div>

      {/* Content */}
      <div className={`flex-1 pb-6 ${isCurrentStep ? '' : ''}`}>
        <div
          className={`rounded-lg border p-3 ${isCurrentStep ? 'border-blue-200 bg-blue-50/30' : 'bg-card'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{roleLabel}</p>
              <p className="text-xs text-muted-foreground">
                {stepStatusLabel[step.status]}
                {step.acted_at && ` — ${new Date(step.acted_at).toLocaleString('vi-VN')}`}
              </p>
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] ${
                step.status === 'APPROVED'
                  ? 'border-green-300 text-green-700'
                  : step.status === 'REJECTED'
                    ? 'border-red-300 text-red-700'
                    : isCurrentStep
                      ? 'border-blue-300 text-blue-700'
                      : ''
              }`}
            >
              {stepStatusLabel[step.status]}
            </Badge>
          </div>

          {step.comment && (
            <div className="mt-2 flex items-start gap-1.5 rounded bg-gray-50 px-2.5 py-1.5 border">
              <MessageSquare className="h-3 w-3 mt-0.5 text-gray-400 shrink-0" />
              <p className="text-xs text-gray-600">{step.comment}</p>
            </div>
          )}

          {canAct && (
            <div className="mt-3 space-y-2">
              <Input
                placeholder="Nhận xét (bắt buộc khi từ chối)..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="h-8 text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="gap-1 bg-green-600 hover:bg-green-700"
                  onClick={handleApprove}
                  disabled={acting}
                >
                  {acting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                  Phê duyệt
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="gap-1"
                  onClick={handleReject}
                  disabled={acting}
                >
                  {acting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                  Từ chối
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function ApprovalTimeline({
  entityType,
  entityId,
}: ApprovalTimelineProps): React.JSX.Element {
  const { data: requests, isLoading } = useApprovalsByEntity(entityType, entityId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!requests || requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-muted-foreground">
        <Clock className="mb-2 h-8 w-8" />
        <p className="text-sm">Chưa có yêu cầu phê duyệt nào</p>
        <p className="text-xs mt-1">
          Tạo yêu cầu phê duyệt từ module quản lý ngân sách hoặc giai đoạn dự án
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {requests.map((request) => (
        <div key={request.id} className="space-y-3">
          {/* Request header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">
                Yêu cầu #{request.id.slice(0, 8)} — {request.entity_type}
              </p>
              <p className="text-xs text-muted-foreground">
                Tạo lúc {new Date(request.created_at).toLocaleString('vi-VN')}
              </p>
            </div>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${requestStatusColor[request.status]}`}
            >
              {requestStatusLabel[request.status]}
            </span>
          </div>

          {/* Flow visualization: PM → GDDA → GDTC */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground px-2">
            {request.steps.map((step, idx) => (
              <div key={step.id} className="flex items-center gap-1">
                <span
                  className={`font-medium ${
                    step.status === 'APPROVED'
                      ? 'text-green-600'
                      : step.status === 'REJECTED'
                        ? 'text-red-600'
                        : step.step_order === request.current_step &&
                            request.status === 'IN_PROGRESS'
                          ? 'text-blue-600'
                          : 'text-gray-400'
                  }`}
                >
                  {STEP_ROLE_LABELS[step.step_order] ?? `Bước ${step.step_order}`}
                </span>
                {idx < request.steps.length - 1 && <span className="text-gray-300">→</span>}
              </div>
            ))}
          </div>

          {/* Step timeline */}
          <div className="ml-1">
            {request.steps
              .sort((a, b) => a.step_order - b.step_order)
              .map((step) => (
                <StepCard key={step.id} step={step} request={request} />
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}
