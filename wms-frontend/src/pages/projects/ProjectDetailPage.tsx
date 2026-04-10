import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { getErrorMessage } from '@/shared/api/axios'
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Building2,
  User,
  Ruler,
  Banknote,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  History,
  Users,
  BarChart3,
  ClipboardList,
  DollarSign,
  ShieldCheck,
  Activity,
  Package,
  CircleCheck,
  HardHat,
  Radar,
  GanttChart,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  useProjectSummary,
  useCostSummary,
  useTransactions,
  useCreateTransaction,
  useDeleteTransaction,
  useCostCategories,
  useUpsertBudget,
  useProjectHistory,
} from '@/entities/project'
import type { ProjectStage, ProjectStatus } from '@/entities/project'
import { WbsTab } from '@/features/project/ui/WbsTab'
import { BoqTab } from '@/features/project/ui/BoqTab'
import { EvmTab } from '@/features/project/ui/EvmTab'
import { ApprovalStatusBadge } from '@/features/project/ui/ApprovalStatusBadge'
import { ApprovalTimeline } from '@/features/project/ui/ApprovalTimeline'
import { PlanTab } from '@/features/project/ui/PlanTab'
import { MonitoringTab } from '@/features/project/ui/MonitoringTab'
import { GanttTab } from '@/features/project/ui/GanttTab'

// ── Constants ──

const stageLabel: Record<ProjectStage, string> = {
  PLANNING: 'Planning',
  PERMITTING: 'Permitting',
  CONSTRUCTION: 'Construction',
  MANAGEMENT: 'Management',
}
const statusLabel: Record<ProjectStatus, string> = {
  DRAFT: 'Nháp',
  BIDDING: 'Đang đấu thầu',
  WON_BID: 'Trúng thầu',
  LOST_BID: 'Trượt thầu',
  ACTIVE: 'Đang triển khai',
  ON_HOLD: 'Tạm dừng',
  SETTLING: 'Đang quyết toán',
  SETTLED: 'Đã quyết toán',
  WARRANTY: 'Bảo hành',
  RETENTION_RELEASED: 'Đã giải tỏa bảo lưu',
  CANCELED: 'Hủy',
}
const statusVariant: Record<ProjectStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  DRAFT: 'outline',
  BIDDING: 'secondary',
  WON_BID: 'default',
  LOST_BID: 'destructive',
  ACTIVE: 'default',
  ON_HOLD: 'secondary',
  SETTLING: 'secondary',
  SETTLED: 'default',
  WARRANTY: 'outline',
  RETENTION_RELEASED: 'default',
  CANCELED: 'destructive',
}

function vnd(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—'
  return Number(v).toLocaleString('vi-VN') + ' ₫'
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// ══════════════════════════════════════════════════════
// ADD TRANSACTION DIALOG
// ══════════════════════════════════════════════════════

const txSchema = z.object({
  category_id: z.string().uuid('Chọn loại chi phí'),
  amount: z.coerce.number().min(0, 'Số tiền không được âm'),
  transaction_date: z.string().min(1, 'Chọn ngày'),
  description: z.string().max(255).optional(),
  reference_type: z.string().max(50).optional(),
  reference_id: z.string().max(50).optional(),
})

type TxForm = z.infer<typeof txSchema>

function AddTransactionDialog({
  open,
  onOpenChange,
  projectId,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  projectId: string
}) {
  const { data: categories } = useCostCategories()
  const createMut = useCreateTransaction()
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(txSchema),
    defaultValues: {
      category_id: '',
      amount: '' as unknown as number,
      transaction_date: new Date().toISOString().split('T')[0],
      description: '',
      reference_type: '',
      reference_id: '',
    },
  })

  const onSubmit = (v: TxForm) => {
    setSubmitting(true)
    createMut.mutate(
      {
        project_id: projectId,
        category_id: v.category_id,
        amount: v.amount,
        transaction_date: v.transaction_date,
        description: v.description || undefined,
        reference_type: v.reference_type || undefined,
        reference_id: v.reference_id || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Tạo giao dịch thành công')
          reset()
          onOpenChange(false)
        },
        onError: (err: unknown) => toast.error(getErrorMessage(err, 'Tạo giao dịch thất bại')),
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
          <DialogTitle>Thêm khoản chi</DialogTitle>
          <DialogDescription>Ghi nhận chi phí thực tế của dự án</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Loại chi phí *</Label>
              <Select onValueChange={(v) => setValue('category_id', v, { shouldValidate: true })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn loại" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category_id && (
                <p className="text-sm text-destructive">{errors.category_id.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx_amount">Số tiền (VNĐ) *</Label>
              <Input
                id="tx_amount"
                type="number"
                step="1"
                placeholder="5000000000"
                {...register('amount')}
              />
              {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tx_desc">Mô tả</Label>
            <Input
              id="tx_desc"
              placeholder="VD: Thanh toán đợt 1 nhà thầu XD"
              {...register('description')}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tx_date">Ngày *</Label>
              <Input id="tx_date" type="date" {...register('transaction_date')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx_ref_type">Loại chứng từ</Label>
              <Select onValueChange={(v) => setValue('reference_type', v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PO_INVOICE">Hóa đơn PO</SelectItem>
                  <SelectItem value="WMS_EXPORT">Phiếu xuất kho</SelectItem>
                  <SelectItem value="MANUAL">Nhập tay</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx_ref_id">Số chứng từ</Label>
              <Input id="tx_ref_id" placeholder="INV-001" {...register('reference_id')} />
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

// ══════════════════════════════════════════════════════
// ADD BUDGET DIALOG
// ══════════════════════════════════════════════════════

const budgetSchema = z.object({
  category_id: z.string().uuid('Chọn loại chi phí'),
  planned_amount: z.coerce.number().min(0, 'Không được âm'),
  notes: z.string().max(500).optional(),
})

type BudgetForm = z.infer<typeof budgetSchema>

function AddBudgetDialog({
  open,
  onOpenChange,
  projectId,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  projectId: string
}) {
  const { data: categories } = useCostCategories()
  const upsertMut = useUpsertBudget()
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(budgetSchema),
    defaultValues: { category_id: '', planned_amount: '' as unknown as number, notes: '' },
  })

  const onSubmit = (v: BudgetForm) => {
    setSubmitting(true)
    upsertMut.mutate(
      {
        project_id: projectId,
        category_id: v.category_id,
        planned_amount: v.planned_amount,
        notes: v.notes || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Cập nhật ngân sách thành công')
          reset()
          onOpenChange(false)
        },
        onError: (err: unknown) => toast.error(getErrorMessage(err, 'Cập nhật ngân sách thất bại')),
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
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Thêm/Cập nhật ngân sách</DialogTitle>
          <DialogDescription>Ghi nhận ngân sách kế hoạch theo hạng mục chi phí</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Loại chi phí *</Label>
            <Select onValueChange={(v) => setValue('category_id', v, { shouldValidate: true })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn loại" />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category_id && (
              <p className="text-sm text-destructive">{errors.category_id.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="b_amount">Số tiền dự kiến (VNĐ) *</Label>
            <Input
              id="b_amount"
              type="number"
              step="1"
              placeholder="10000000000"
              {...register('planned_amount')}
            />
            {errors.planned_amount && (
              <p className="text-sm text-destructive">{errors.planned_amount.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="b_notes">Ghi chú</Label>
            <Input id="b_notes" placeholder="Ghi chú..." {...register('notes')} />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Lưu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ══════════════════════════════════════════════════════
// FINANCIAL KPI CARDS (NV4)
// ══════════════════════════════════════════════════════

function FinanceKpiCards({ projectId }: { projectId: string }) {
  const { data: summary, isLoading } = useProjectSummary(projectId)

  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-4 animate-pulse">
            <div className="h-3 w-20 bg-gray-200 rounded mb-3" />
            <div className="h-7 w-32 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    )
  }

  const { finance } = summary
  const isOverBudget = finance.variance < 0

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Budget */}
      <div className="rounded-xl border bg-gradient-to-br from-blue-50 to-white p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
            <Banknote className="h-4 w-4 text-blue-600" />
          </div>
          <span className="text-xs font-medium text-blue-600 uppercase tracking-wider">
            Ngân sách
          </span>
        </div>
        <p className="text-2xl font-bold text-gray-900">{vnd(finance.total_budget)}</p>
        <p className="text-xs text-muted-foreground mt-1">Tổng ngân sách phê duyệt</p>
      </div>

      {/* Actual Cost */}
      <div
        className={`rounded-xl border p-4 ${isOverBudget ? 'bg-gradient-to-br from-red-50 to-white border-red-200' : 'bg-gradient-to-br from-green-50 to-white'}`}
      >
        <div className="flex items-center gap-2 mb-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${isOverBudget ? 'bg-red-100' : 'bg-green-100'}`}
          >
            <DollarSign className={`h-4 w-4 ${isOverBudget ? 'text-red-600' : 'text-green-600'}`} />
          </div>
          <span
            className={`text-xs font-medium uppercase tracking-wider ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}
          >
            Chi phí thực tế
          </span>
        </div>
        <p className={`text-2xl font-bold ${isOverBudget ? 'text-red-600' : 'text-gray-900'}`}>
          {vnd(finance.total_actual)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{finance.transaction_count} giao dịch</p>
      </div>

      {/* Variance */}
      <div
        className={`rounded-xl border p-4 ${
          isOverBudget
            ? 'bg-gradient-to-br from-red-50 to-white border-red-200'
            : 'bg-gradient-to-br from-emerald-50 to-white'
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${isOverBudget ? 'bg-red-100' : 'bg-emerald-100'}`}
          >
            {isOverBudget ? (
              <TrendingUp className="h-4 w-4 text-red-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-emerald-600" />
            )}
          </div>
          <span
            className={`text-xs font-medium uppercase tracking-wider ${isOverBudget ? 'text-red-600' : 'text-emerald-600'}`}
          >
            Chênh lệch
          </span>
        </div>
        <p className={`text-2xl font-bold ${isOverBudget ? 'text-red-600' : 'text-emerald-600'}`}>
          {finance.variance >= 0 ? '+' : ''}
          {vnd(finance.variance)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {finance.variance_percent !== 0 && (
            <span className={isOverBudget ? 'text-red-500' : 'text-emerald-500'}>
              {finance.variance_percent > 0 ? '+' : ''}
              {finance.variance_percent}%
            </span>
          )}
          {finance.variance_percent === 0 && 'Cân bằng'} so với ngân sách
        </p>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// OVERVIEW TAB (NV1 - Enhanced)
// ══════════════════════════════════════════════════════

function OverviewTab({ projectId }: { projectId: string }) {
  const { data: summary, isLoading } = useProjectSummary(projectId)

  if (isLoading || !summary) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const { project, wbs, boq, team_size, recent_history } = summary

  return (
    <div className="space-y-6">
      {/* Quick stats row */}
      <div className="grid grid-cols-4 gap-4">
        <QuickStat
          icon={<Activity className="h-4 w-4 text-violet-500" />}
          label="Tiến độ WBS"
          value={`${wbs.avg_progress}%`}
          sub={`${wbs.completed_nodes}/${wbs.total_nodes} hoàn thành`}
        />
        <QuickStat
          icon={<Package className="h-4 w-4 text-orange-500" />}
          label="BOQ"
          value={`${boq.total_items} hạng mục`}
          sub={
            boq.over_issued_count > 0 ? `${boq.over_issued_count} vượt định mức` : 'Trong kiểm soát'
          }
          accent={boq.over_issued_count > 0 ? 'red' : undefined}
        />
        <QuickStat
          icon={<Users className="h-4 w-4 text-blue-500" />}
          label="Đội dự án"
          value={`${team_size} người`}
          sub={project.manager?.full_name ?? 'Chưa gán PM'}
        />
        <QuickStat
          icon={<CircleCheck className="h-4 w-4 text-green-500" />}
          label="WBS đang TH"
          value={`${wbs.in_progress_nodes}`}
          sub={`${wbs.total_nodes - wbs.completed_nodes - wbs.in_progress_nodes} chờ`}
        />
      </div>

      {/* Project info + Recent history */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Thông tin dự án
          </h3>
          <div className="rounded-lg border bg-card p-5 space-y-4">
            <InfoRow
              icon={<Building2 className="h-4 w-4" />}
              label="Tổ chức"
              value={project.organization?.organization_name}
            />
            <InfoRow
              icon={<MapPin className="h-4 w-4" />}
              label="Địa điểm"
              value={project.location}
            />
            <InfoRow
              icon={<Ruler className="h-4 w-4" />}
              label="GFA"
              value={
                project.gfa_m2 !== null && project.gfa_m2 !== undefined
                  ? `${Number(project.gfa_m2).toLocaleString('vi-VN')} m²`
                  : null
              }
            />
            <InfoRow
              icon={<Banknote className="h-4 w-4" />}
              label="Ngân sách tổng"
              value={
                project.budget !== null && project.budget !== undefined ? vnd(project.budget) : null
              }
            />
            <InfoRow
              icon={<User className="h-4 w-4" />}
              label="Chủ đầu tư"
              value={project.investor?.name}
            />
            <InfoRow
              icon={<User className="h-4 w-4" />}
              label="Giám đốc dự án"
              value={project.manager?.full_name}
            />
            <InfoRow
              icon={<Building2 className="h-4 w-4" />}
              label="Phòng ban quản lý"
              value={project.department?.organization_name}
            />
            {project.description && (
              <div className="pt-2 border-t">
                <p className="text-xs text-gray-400 mb-1">Mô tả</p>
                <p className="text-sm text-gray-700">{project.description}</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Hoạt động gần đây
          </h3>
          {recent_history.length === 0 ? (
            <div className="flex items-center justify-center rounded-lg border border-dashed py-12 text-sm text-muted-foreground">
              Chưa có hoạt động nào
            </div>
          ) : (
            <div className="rounded-lg border bg-card divide-y">
              {recent_history.map((h) => {
                const fieldLabels: Record<string, string> = {
                  manager_id: 'Giám đốc DA',
                  department_id: 'Phòng ban',
                  investor_id: 'Chủ đầu tư',
                  organization_id: 'Tổ chức',
                  status: 'Trạng thái',
                  stage: 'Giai đoạn',
                  budget: 'Ngân sách',
                }
                const meta = h.metadata as Record<string, string> | null
                const oldDisplay = meta?.old_formatted ?? h.old_label ?? h.old_value ?? '(trống)'
                const newDisplay = meta?.new_formatted ?? h.new_label ?? h.new_value ?? '(trống)'
                return (
                  <div key={h.id} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm">
                        <span className="font-semibold">
                          {fieldLabels[h.field_name] ?? h.field_name}
                        </span>{' '}
                        thay đổi
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(h.changed_at).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs">
                      <span className="rounded bg-red-50 border border-red-200 px-1.5 py-0.5 text-red-700">
                        {oldDisplay}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="rounded bg-green-50 border border-green-200 px-1.5 py-0.5 text-green-700">
                        {newDisplay}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// COST TAB (Chi phí & Tài chính)
// ══════════════════════════════════════════════════════

function CostTab({ projectId }: { projectId: string }) {
  const { data: costSummary, isLoading: costLoading } = useCostSummary(projectId)
  const { data: transactions } = useTransactions(projectId)
  const deleteTx = useDeleteTransaction()
  const [txDialogOpen, setTxDialogOpen] = useState(false)
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false)

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard
          label="Tổng ngân sách"
          value={vnd(costSummary?.total_budget)}
          loading={costLoading}
        />
        <SummaryCard
          label="Chi phí thực tế"
          value={vnd(costSummary?.total_actual)}
          loading={costLoading}
          accent={
            costSummary && costSummary.total_actual > 0
              ? costSummary.total_actual > costSummary.total_budget
                ? 'red'
                : 'green'
              : undefined
          }
        />
        <SummaryCard
          label="Còn lại"
          value={vnd(costSummary?.remaining)}
          loading={costLoading}
          accent={costSummary ? (costSummary.remaining < 0 ? 'red' : 'green') : undefined}
        />
        <div
          className={`rounded-lg border p-4 ${(costSummary?.variance_percent ?? 0) > 0 ? 'border-red-200 bg-red-50/50' : (costSummary?.variance_percent ?? 0) < 0 ? 'border-green-200 bg-green-50/50' : ''}`}
        >
          <p className="text-xs font-medium text-muted-foreground">% Chênh lệch</p>
          {costLoading ? (
            <Loader2 className="mt-2 h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`text-2xl font-bold ${(costSummary?.variance_percent ?? 0) > 0 ? 'text-red-600' : (costSummary?.variance_percent ?? 0) < 0 ? 'text-green-600' : ''}`}
              >
                {(costSummary?.variance_percent ?? 0) > 0 ? '+' : ''}
                {costSummary?.variance_percent ?? 0}%
              </span>
              {(costSummary?.variance_percent ?? 0) > 0 ? (
                <TrendingUp className="h-5 w-5 text-red-500" />
              ) : (costSummary?.variance_percent ?? 0) < 0 ? (
                <TrendingDown className="h-5 w-5 text-green-500" />
              ) : (
                <Minus className="h-5 w-5 text-gray-400" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Budget vs Actual breakdown */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Ngân sách vs Thực tế theo hạng mục
          </h3>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => setBudgetDialogOpen(true)}
          >
            <Plus className="h-3 w-3" /> Thêm ngân sách
          </Button>
        </div>

        {costSummary && costSummary.breakdown.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã</TableHead>
                <TableHead>Hạng mục</TableHead>
                <TableHead className="text-right">Ngân sách</TableHead>
                <TableHead className="text-right">Thực tế</TableHead>
                <TableHead className="text-right">Chênh lệch</TableHead>
                <TableHead className="text-right">GD</TableHead>
                <TableHead className="w-[60px]">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costSummary.breakdown.map((row) => {
                const diff = row.actual - row.planned
                const pct =
                  row.planned > 0
                    ? Math.round((row.actual / row.planned) * 100)
                    : row.actual > 0
                      ? 999
                      : 0
                const overBudget = diff > 0
                return (
                  <TableRow key={row.category_id} className={overBudget ? 'bg-red-50/40' : ''}>
                    <TableCell className="font-mono text-xs">{row.code}</TableCell>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-right">{vnd(row.planned)}</TableCell>
                    <TableCell className="text-right font-semibold">{vnd(row.actual)}</TableCell>
                    <TableCell
                      className={`text-right font-semibold ${overBudget ? 'text-red-600' : diff < 0 ? 'text-green-600' : ''}`}
                    >
                      {diff > 0 ? '+' : ''}
                      {vnd(diff)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{row.count}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 flex-1 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${pct > 100 ? 'bg-red-400' : pct > 80 ? 'bg-amber-400' : 'bg-green-400'}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-medium text-muted-foreground w-8 text-right">
                          {pct}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="flex items-center justify-center rounded-lg border border-dashed py-8 text-sm text-muted-foreground">
            Chưa có dữ liệu ngân sách. Thêm loại chi phí và ngân sách để bắt đầu.
          </div>
        )}
      </div>

      {/* Transaction list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Danh sách khoản chi thực tế
          </h3>
          <Button size="sm" className="gap-1" onClick={() => setTxDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Thêm khoản chi
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ngày</TableHead>
              <TableHead>Loại chi phí</TableHead>
              <TableHead>Mô tả</TableHead>
              <TableHead>Chứng từ</TableHead>
              <TableHead className="text-right">Số tiền</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!transactions?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Chưa có khoản chi nào
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="text-sm">{fmtDate(tx.transaction_date)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {tx.category?.code} — {tx.category?.name}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{tx.description ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {tx.reference_type ? `${tx.reference_type}` : '—'}
                    {tx.reference_id ? ` #${tx.reference_id}` : ''}
                  </TableCell>
                  <TableCell className="text-right font-semibold">{vnd(tx.amount)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-gray-400 hover:text-red-500"
                      onClick={() =>
                        deleteTx.mutate(tx.id, { onSuccess: () => toast.success('Đã xóa') })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AddTransactionDialog
        open={txDialogOpen}
        onOpenChange={setTxDialogOpen}
        projectId={projectId}
      />
      <AddBudgetDialog
        open={budgetDialogOpen}
        onOpenChange={setBudgetDialogOpen}
        projectId={projectId}
      />
    </div>
  )
}

// ══════════════════════════════════════════════════════
// HISTORY TAB
// ══════════════════════════════════════════════════════

function HistoryTab({ projectId }: { projectId: string }) {
  const { data: history } = useProjectHistory(projectId)

  if (!history?.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-muted-foreground">
        <History className="mb-2 h-8 w-8" />
        <p className="text-sm">Chưa có lịch sử thay đổi</p>
      </div>
    )
  }

  return (
    <div className="relative ml-4 border-l-2 border-violet-200 pl-6 space-y-0">
      {history.map((h, idx) => {
        const fieldLabels: Record<string, string> = {
          manager_id: 'Giám đốc DA',
          department_id: 'Phòng ban',
          investor_id: 'Chủ đầu tư',
          organization_id: 'Tổ chức',
          status: 'Trạng thái',
          stage: 'Giai đoạn',
          budget: 'Ngân sách',
        }
        const fieldName = fieldLabels[h.field_name] ?? h.field_name
        const meta = h.metadata as Record<string, string> | null
        const oldDisplay = meta?.old_formatted ?? h.old_label ?? h.old_value ?? '(trống)'
        const newDisplay = meta?.new_formatted ?? h.new_label ?? h.new_value ?? '(trống)'
        const isBudget = h.field_name === 'budget'
        const isFirst = idx === 0

        return (
          <div key={h.id} className="relative pb-6">
            <div
              className={`absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 ${isFirst ? 'border-violet-500 bg-violet-500' : 'border-violet-300 bg-white'}`}
            >
              {isFirst && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
            </div>
            <div className="rounded-lg border bg-card px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-semibold text-gray-800">{fieldName}</span> thay đổi
                  </p>
                  <div className="mt-1.5 flex items-center gap-2 text-sm">
                    <span className="inline-flex items-center rounded border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                      {oldDisplay}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className="inline-flex items-center rounded border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                      {newDisplay}
                    </span>
                  </div>
                  {isBudget && meta?.difference && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Chênh lệch: <span className="font-medium">{meta.difference}</span>
                    </p>
                  )}
                </div>
                <p className="shrink-0 text-xs text-gray-400 whitespace-nowrap">
                  {new Date(h.changed_at).toLocaleString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              {h.change_reason && (
                <div className="mt-2 flex items-start gap-1.5 rounded bg-amber-50 border border-amber-200 px-2.5 py-1.5">
                  <span className="text-xs text-amber-800">
                    <span className="font-semibold">Lý do:</span> {h.change_reason}
                  </span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════

export function ProjectDetailPage(): React.JSX.Element {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: summary, isLoading } = useProjectSummary(projectId)
  const { data: history } = useProjectHistory(projectId)

  const project = summary?.project

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="space-y-4">
        <Link to="/projects">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
          </Button>
        </Link>
        <p className="text-muted-foreground">Dự án không tồn tại</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/projects">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{project.project_name}</h1>
              <Badge variant="outline">{stageLabel[project.stage]}</Badge>
              <Badge variant={statusVariant[project.status]}>{statusLabel[project.status]}</Badge>
              <ApprovalStatusBadge entityType="PROJECT_BUDGET" entityId={project.id} />
            </div>
            <p className="text-sm text-muted-foreground">{project.project_code}</p>
          </div>
        </div>
        <Link to={`/projects/${projectId}/documents`}>
          <Button variant="outline" size="sm" className="gap-1">
            <FileText className="h-3.5 w-3.5" /> Tài liệu
          </Button>
        </Link>
      </div>

      {/* ── NV4: Financial KPI Cards ── */}
      <FinanceKpiCards projectId={projectId!} />

      {/* ── Tabs ── */}
      <Tabs defaultValue="overview">
        <TabsList className="flex w-full overflow-x-auto">
          <TabsTrigger value="overview" className="gap-1 flex-1">
            <BarChart3 className="h-3.5 w-3.5" /> Tổng quan
          </TabsTrigger>
          <TabsTrigger value="plan" className="gap-1 flex-1">
            <HardHat className="h-3.5 w-3.5" /> Kế hoạch
          </TabsTrigger>
          <TabsTrigger value="gantt" className="gap-1 flex-1">
            <GanttChart className="h-3.5 w-3.5" /> Tiến độ
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="gap-1 flex-1">
            <Radar className="h-3.5 w-3.5" /> Theo dõi
          </TabsTrigger>
          <TabsTrigger value="wbs" className="gap-1 flex-1">
            <ClipboardList className="h-3.5 w-3.5" /> WBS
          </TabsTrigger>
          <TabsTrigger value="boq" className="gap-1 flex-1">
            <Package className="h-3.5 w-3.5" /> BOQ
          </TabsTrigger>
          <TabsTrigger value="cost" className="gap-1 flex-1">
            <DollarSign className="h-3.5 w-3.5" /> Tài chính
          </TabsTrigger>
          <TabsTrigger value="approval" className="gap-1 flex-1">
            <ShieldCheck className="h-3.5 w-3.5" /> Phê duyệt
            {history && history.length > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-200 px-1.5 text-[10px] font-bold text-gray-600">
                {history.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ══ TAB: TỔNG QUAN ══ */}
        <TabsContent value="overview" className="pt-4">
          <OverviewTab projectId={projectId!} />
        </TabsContent>

        {/* ══ TAB: KẾ HOẠCH THI CÔNG (PROJ1) ══ */}
        <TabsContent value="plan" className="pt-4">
          <PlanTab projectId={projectId!} />
        </TabsContent>

        {/* ══ TAB: TIẾN ĐỘ & GANTT (PROJ3) ══ */}
        <TabsContent value="gantt" className="pt-4">
          <GanttTab projectId={projectId!} />
        </TabsContent>

        {/* ══ TAB: THEO DÕI & ĐIỀU CHỈNH (PROJ2) ══ */}
        <TabsContent value="monitoring" className="pt-4">
          <MonitoringTab projectId={projectId!} />
        </TabsContent>

        {/* ══ TAB: WBS & Tiến độ ══ */}
        <TabsContent value="wbs" className="pt-4 space-y-6">
          <WbsTab projectId={projectId!} />
          <div className="border-t pt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">
              Phân tích EVM (Earned Value)
            </h3>
            <EvmTab projectId={projectId!} />
          </div>
        </TabsContent>

        {/* ══ TAB: BOQ & Vật tư ══ */}
        <TabsContent value="boq" className="pt-4">
          <BoqTab projectId={projectId!} />
        </TabsContent>

        {/* ══ TAB: Chi phí & Tài chính ══ */}
        <TabsContent value="cost" className="pt-4">
          <CostTab projectId={projectId!} />
        </TabsContent>

        {/* ══ TAB: Lịch sử & Phê duyệt ══ */}
        <TabsContent value="approval" className="pt-4">
          <div className="grid grid-cols-2 gap-6">
            {/* Lịch sử thay đổi */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                <History className="h-4 w-4" /> Lịch sử thay đổi
              </h3>
              <HistoryTab projectId={projectId!} />
            </div>

            {/* Luồng phê duyệt */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> Luồng phê duyệt
              </h3>
              <ApprovalTimeline entityType="PROJECT_BUDGET" entityId={projectId!} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── Shared ──

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | null | undefined
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800">{value ?? '—'}</p>
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  loading,
  accent,
}: {
  label: string
  value: string
  loading: boolean
  accent?: 'red' | 'green'
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${accent === 'red' ? 'border-red-200 bg-red-50/50' : accent === 'green' ? 'border-green-200 bg-green-50/50' : 'bg-card'}`}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {loading ? (
        <Loader2 className="mt-2 h-5 w-5 animate-spin text-muted-foreground" />
      ) : (
        <p
          className={`mt-1 text-xl font-bold ${accent === 'red' ? 'text-red-600' : accent === 'green' ? 'text-green-600' : ''}`}
        >
          {value}
        </p>
      )}
    </div>
  )
}

function QuickStat({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  accent?: 'red'
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
      <p
        className={`text-xs mt-0.5 ${accent === 'red' ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}
      >
        {sub}
      </p>
    </div>
  )
}
