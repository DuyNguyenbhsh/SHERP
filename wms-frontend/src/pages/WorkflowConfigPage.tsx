import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Trash2,
  PauseCircle,
  PlayCircle,
  Loader2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Shield,
  Clock,
  Users,
  AlertTriangle,
  Search,
  Pencil,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useApprovalConfigs,
  useCreateApprovalConfig,
  useUpdateApprovalConfig,
  useDeleteApprovalConfig,
  useToggleApprovalConfig,
} from '@/entities/approval'
import { useRoles } from '@/entities/role'
import { getErrorMessage } from '@/shared/api/axios'
import type { ApprovalConfig } from '@/entities/project/types'
import { useAuthStore } from '@/features/auth'
import { TableActions } from '@/shared/ui/TableActions'

const MODULES = [
  { value: 'PROJECT', label: 'Dự án' },
  { value: 'PROCUREMENT', label: 'Mua hàng' },
  { value: 'WMS', label: 'Kho vận' },
  { value: 'HCM', label: 'Nhân sự' },
  { value: 'TMS', label: 'Vận tải' },
  { value: 'FINANCE', label: 'Tài chính' },
]

const ENTITY_TYPES = [
  { value: 'PURCHASE_REQUEST', label: 'Mua vật tư / Thiết bị' },
  {
    value: 'SUBCONTRACTOR_PAYMENT',
    label: 'Tạm ứng / Thanh toán Thầu phụ',
  },
  { value: 'PROJECT_BUDGET', label: 'Ngân sách dự án' },
  { value: 'PROJECT_STAGE', label: 'Chuyển giai đoạn dự án' },
  { value: 'PERSONNEL_CHANGE', label: 'Thay đổi nhân sự' },
  { value: 'OUTBOUND_ORDER', label: 'Phiếu xuất kho' },
  { value: 'GENERAL', label: 'Chung' },
]

interface StepForm {
  step_order: number
  approver_role: string
  is_mandatory: boolean
  required_count: number
  timeout_hours: string
  alternative_approver_id: string
}

/** Format raw number string with thousand separators */
function fmtMoney(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  return Number(digits).toLocaleString('en-US')
}

/** Parse formatted string back to raw digits */
function parseMoney(formatted: string): string {
  return formatted.replace(/\D/g, '')
}

function emptyStep(order: number): StepForm {
  return {
    step_order: order,
    approver_role: '',
    is_mandatory: true,
    required_count: 1,
    timeout_hours: '72',
    alternative_approver_id: '',
  }
}

/* ── Timeline visualization for a config's steps ── */
function StepTimeline({
  config,
  roles,
}: {
  config: ApprovalConfig
  roles: { role_code: string; role_name: string }[]
}): React.JSX.Element {
  const roleMap = new Map(roles.map((r) => [r.role_code, r.role_name]))
  const sorted = [...(config.steps || [])].sort((a, b) => a.step_order - b.step_order)

  return (
    <div className="flex items-center gap-1 flex-wrap py-1">
      {sorted.map((step, idx) => (
        <div key={step.id} className="flex items-center gap-1">
          <div
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${
              step.is_mandatory !== false
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-muted border-border text-muted-foreground'
            }`}
          >
            <span className="font-bold">{step.step_order}</span>
            <span>{roleMap.get(step.approver_role ?? '') ?? step.approver_role ?? '?'}</span>
            {(step.required_count ?? 1) > 1 && (
              <span className="flex items-center gap-0.5 text-[10px] opacity-70">
                <Users className="h-3 w-3" />
                {step.required_count}
              </span>
            )}
            {step.timeout_hours && (
              <span className="flex items-center gap-0.5 text-[10px] opacity-70">
                <Clock className="h-3 w-3" />
                {step.timeout_hours}h
              </span>
            )}
          </div>
          {idx < sorted.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      ))}
    </div>
  )
}

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ADMIN'])

export function WorkflowConfigPage(): React.JSX.Element {
  const user = useAuthStore((s) => s.user)
  const canToggle = ADMIN_ROLES.has(user?.role ?? '')
  const queryClient = useQueryClient()

  const { data: configs, isLoading } = useApprovalConfigs()
  const { data: roles } = useRoles()
  const createMut = useCreateApprovalConfig()
  const updateMut = useUpdateApprovalConfig()
  const deleteMut = useDeleteApprovalConfig()
  const toggleMut = useToggleApprovalConfig()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<ApprovalConfig | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Filters
  const [searchText, setSearchText] = useState('')
  const [filterModule, setFilterModule] = useState('')
  const [filterThreshold, setFilterThreshold] = useState('')

  // Form
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [moduleCode, setModuleCode] = useState('')
  const [entityType, setEntityType] = useState('')
  const [steps, setSteps] = useState<StepForm[]>([emptyStep(1)])
  const [thresholdEnabled, setThresholdEnabled] = useState(false)
  const [thresholdLow, setThresholdLow] = useState('5000000')
  const [thresholdHigh, setThresholdHigh] = useState('50000000')

  const resetForm = (): void => {
    setName('')
    setDescription('')
    setModuleCode('')
    setEntityType('')
    setSteps([emptyStep(1)])
    setThresholdEnabled(false)
    setThresholdLow('5000000')
    setThresholdHigh('50000000')
  }

  const loadConfigForEdit = (cfg: ApprovalConfig): void => {
    setEditingId(cfg.id)
    setName(cfg.name)
    setDescription(cfg.description || '')
    setModuleCode(cfg.module_code || '')
    setEntityType(cfg.entity_type)
    const sorted = [...(cfg.steps || [])].sort((a, b) => a.step_order - b.step_order)
    setSteps(
      sorted.length > 0
        ? sorted.map((s) => ({
            step_order: s.step_order,
            approver_role: s.approver_role ?? '',
            is_mandatory: s.is_mandatory !== false,
            required_count: s.required_count ?? 1,
            timeout_hours: s.timeout_hours ? String(s.timeout_hours) : '72',
            alternative_approver_id: s.alternative_approver_id ?? '',
          }))
        : [emptyStep(1)],
    )
    const rules = cfg.conditions?.['threshold_rules'] as { max_amount: number | null }[] | undefined
    if (rules?.length) {
      setThresholdEnabled(true)
      const amounts = rules.filter((r) => r.max_amount !== null).map((r) => r.max_amount!)
      setThresholdLow(amounts[0] ? String(amounts[0]) : '5000000')
      setThresholdHigh(amounts[1] ? String(amounts[1]) : '50000000')
    } else {
      setThresholdEnabled(false)
      setThresholdLow('5000000')
      setThresholdHigh('50000000')
    }
    setDialogOpen(true)
  }

  const addStep = (): void => setSteps((p) => [...p, emptyStep(p.length + 1)])
  const removeStep = (i: number): void =>
    setSteps((p) =>
      p.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, step_order: idx + 1 })),
    )
  const updateStep = (i: number, f: keyof StepForm, v: string | number | boolean): void => {
    setSteps((p) => p.map((s, idx) => (idx === i ? { ...s, [f]: v } : s)))
  }

  const handleSave = (): void => {
    if (!name.trim() || !entityType) {
      toast.error('Nhập tên và loại đối tượng')
      return
    }
    if (steps.some((s) => !s.approver_role)) {
      toast.error('Mỗi bước phải chọn vai trò')
      return
    }

    const conditions: Record<string, unknown> = {}
    if (thresholdEnabled) {
      const low = parseInt(thresholdLow),
        high = parseInt(thresholdHigh)
      if (!isNaN(low) && !isNaN(high)) {
        conditions['threshold_rules'] = [
          { max_amount: low, skip_to_step: 999 },
          { max_amount: high, max_step: Math.min(steps.length, 2) },
          { max_amount: null, max_step: 999 },
        ]
      }
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      module_code: moduleCode || undefined,
      entity_type: entityType,
      conditions: Object.keys(conditions).length > 0 ? conditions : undefined,
      steps: steps.map((s) => ({
        step_order: s.step_order,
        approver_role: s.approver_role,
        is_required: true,
        is_mandatory: s.is_mandatory,
        required_count: s.required_count,
        alternative_approver_id: s.alternative_approver_id || undefined,
        timeout_hours: s.timeout_hours ? parseInt(s.timeout_hours) : undefined,
      })),
    }

    const onDone = (): void => {
      toast.success(editingId ? 'Cập nhật thành công' : 'Tạo quy trình thành công')
      resetForm()
      setEditingId(null)
      setDialogOpen(false)
    }
    const onFail = (err: unknown): void => {
      toast.error(getErrorMessage(err, editingId ? 'Cập nhật thất bại' : 'Tạo thất bại'))
    }

    if (editingId) {
      updateMut.mutate({ id: editingId, ...payload } as Parameters<typeof updateMut.mutate>[0], {
        onSuccess: onDone,
        onError: onFail,
      })
    } else {
      createMut.mutate(payload as Parameters<typeof createMut.mutate>[0], {
        onSuccess: onDone,
        onError: onFail,
      })
    }
  }

  const activeRoles = (roles ?? []).filter((r) => r.is_active)
  const roleMap = new Map(activeRoles.map((r) => [r.role_code, r.role_name]))

  const fmtThreshold = (cfg: ApprovalConfig): string => {
    const rules = cfg.conditions?.['threshold_rules'] as { max_amount: number | null }[] | undefined
    if (!rules?.length) return '—'
    return rules
      .filter((r) => r.max_amount !== null)
      .map((r) => `${(r.max_amount! / 1e6).toFixed(0)}tr`)
      .join(' / ')
  }

  const filteredConfigs = (configs ?? []).filter((cfg) => {
    if (searchText && !cfg.name.toLowerCase().includes(searchText.toLowerCase())) return false
    if (filterModule && (cfg.module_code || '') !== filterModule) return false
    if (filterThreshold) {
      const thresh = fmtThreshold(cfg)
      if (filterThreshold === 'has' && thresh === '\u2014') return false
      if (filterThreshold === 'none' && thresh !== '\u2014') return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{'Cấu hình Quy trình phê duyệt'}</h1>
          <p className="text-sm text-muted-foreground">
            {'Thiết lập luồng duyệt n-cấp cho từng module nghiệp vụ'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canToggle && (
            <TableActions
              templateUrl="/approvals/excel/template"
              importUrl="/approvals/excel/import"
              exportUrl="/approvals/excel/export"
              onImportSuccess={() =>
                void queryClient.invalidateQueries({ queryKey: ['approvals', 'configs'] })
              }
              importTitle="Import quy trình phê duyệt"
              importDescription="Upload file Excel theo mẫu để thêm hoặc cập nhật quy trình."
            />
          )}
          <Button
            onClick={() => {
              resetForm()
              setEditingId(null)
              setDialogOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {'Thêm quy trình'}
          </Button>
        </div>
      </div>

      {/* ── Filter Toolbar ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên quy trình..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select
          value={filterModule || '__all__'}
          onValueChange={(v) => setFilterModule(v === '__all__' ? '' : v)}
        >
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Tất cả module" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{'Tất cả module'}</SelectItem>
            {MODULES.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filterThreshold || '__all__'}
          onValueChange={(v) => setFilterThreshold(v === '__all__' ? '' : v)}
        >
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Ngưỡng tiền" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{'Tất cả'}</SelectItem>
            <SelectItem value="has">{'Có ngưỡng'}</SelectItem>
            <SelectItem value="none">{'Không có ngưỡng'}</SelectItem>
          </SelectContent>
        </Select>
        {(searchText || filterModule || filterThreshold) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchText('')
              setFilterModule('')
              setFilterThreshold('')
            }}
          >
            {'Xóa bộ lọc'}
          </Button>
        )}
      </div>

      {/* ── Config Table ── */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]" />
              <TableHead>{`Tên quy trình`}</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>{`Ngưỡng`}</TableHead>
              <TableHead>{`Trạng thái`}</TableHead>
              <TableHead className="text-right w-[140px]">{`Thao tác`}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </TableCell>
              </TableRow>
            ) : !filteredConfigs.length ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {configs?.length ? 'Không tìm thấy quy trình phù hợp' : 'Chưa có quy trình nào'}
                </TableCell>
              </TableRow>
            ) : (
              filteredConfigs.map((cfg) => {
                const expanded = expandedId === cfg.id
                return (
                  <TableRow key={cfg.id} className="group">
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setExpandedId(expanded ? null : cfg.id)}
                      >
                        {expanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell colSpan={expanded ? 5 : 1}>
                      <div>
                        <p className="font-medium text-sm">{cfg.name}</p>
                        {cfg.description && !expanded && (
                          <p className="text-xs text-muted-foreground line-clamp-2 max-w-[400px]">
                            {cfg.description}
                          </p>
                        )}
                        {expanded && (
                          <div className="mt-3 space-y-0 rounded-lg border overflow-hidden">
                            {/* Luồng duyệt */}
                            <div className="p-4 bg-muted/30">
                              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
                                {'Luồng duyệt'}
                              </p>
                              <StepTimeline config={cfg} roles={activeRoles} />
                              {cfg.steps?.some((s) => s.is_mandatory === false) && (
                                <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  {
                                    'Bước màu xám = không bắt buộc (tự động bỏ qua nếu hồ sơ đầy đủ)'
                                  }
                                </p>
                              )}
                            </div>

                            {/* Chi tiết nghiệp vụ */}
                            <div className="border-t bg-accent/30 p-5">
                              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-4">
                                {'Chi tiết nghiệp vụ'}
                              </p>
                              <div className="grid grid-cols-[1fr_1px_1fr_1px_1fr] gap-0">
                                {/* Cột 1: Mục đích */}
                                <div className="pr-5">
                                  <p className="text-xs font-semibold text-muted-foreground mb-2">
                                    {'Mục đích'}
                                  </p>
                                  <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                                    {cfg.description || 'Chưa có mô tả'}
                                  </p>
                                </div>

                                {/* Separator */}
                                <div className="bg-border" />

                                {/* Cột 2: Phạm vi */}
                                <div className="px-5">
                                  <p className="text-xs font-semibold text-muted-foreground mb-2">
                                    {'Phạm vi'}
                                  </p>
                                  <ul className="space-y-1.5 text-sm">
                                    <li className="flex items-baseline gap-1.5">
                                      <span className="text-muted-foreground shrink-0">
                                        {'Module:'}
                                      </span>
                                      <strong>
                                        {MODULES.find((m) => m.value === cfg.module_code)?.label ||
                                          cfg.module_code ||
                                          'Tất cả'}
                                      </strong>
                                    </li>
                                    <li className="flex items-baseline gap-1.5">
                                      <span className="text-muted-foreground shrink-0">
                                        {'Đối tượng:'}
                                      </span>
                                      <strong>
                                        {ENTITY_TYPES.find((t) => t.value === cfg.entity_type)
                                          ?.label || cfg.entity_type}
                                      </strong>
                                    </li>
                                    <li className="flex items-baseline gap-1.5">
                                      <span className="text-muted-foreground shrink-0">
                                        {'Số bước duyệt:'}
                                      </span>
                                      <strong>{cfg.steps?.length ?? 0}</strong>
                                    </li>
                                  </ul>
                                </div>

                                {/* Separator */}
                                <div className="bg-border" />

                                {/* Cột 3: Điều kiện */}
                                <div className="pl-5">
                                  <p className="text-xs font-semibold text-muted-foreground mb-2">
                                    {'Điều kiện'}
                                  </p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {fmtThreshold(cfg) !== '\u2014' ? (
                                      <>
                                        <Badge variant="secondary" className="text-xs font-normal">
                                          {'Ngưỡng: '}
                                          {fmtThreshold(cfg)}
                                        </Badge>
                                        <Badge variant="outline" className="text-xs font-normal">
                                          {'Dưới ngưỡng thấp = tự duyệt'}
                                        </Badge>
                                      </>
                                    ) : (
                                      <Badge variant="outline" className="text-xs font-normal">
                                        {'Không giới hạn ngưỡng tiền'}
                                      </Badge>
                                    )}
                                    {cfg.steps?.some((s) => s.is_mandatory === false) && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs font-normal border-amber-300 text-amber-700"
                                      >
                                        {'Có bước không bắt buộc'}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    {!expanded && (
                      <>
                        <TableCell>
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                            {cfg.module_code || cfg.entity_type}
                          </code>
                        </TableCell>
                        <TableCell className="text-sm">{fmtThreshold(cfg)}</TableCell>
                        <TableCell>
                          <Badge variant={cfg.is_active ? 'default' : 'outline'}>
                            {cfg.is_active ? 'Hoạt động' : 'Tạm dừng'}
                          </Badge>
                        </TableCell>
                      </>
                    )}
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={!canToggle}
                          title={
                            !canToggle
                              ? 'Chỉ ADMIN / SUPER_ADMIN mới được thay đổi trạng thái'
                              : cfg.is_active
                                ? 'Tạm dừng'
                                : 'Kích hoạt'
                          }
                          onClick={() => toggleMut.mutate(cfg.id)}
                        >
                          {cfg.is_active ? (
                            <PauseCircle className="h-4 w-4" />
                          ) : (
                            <PlayCircle className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={cfg.is_active}
                          title={
                            cfg.is_active
                              ? 'Vui lòng chuyển sang Tạm dừng để chỉnh sửa'
                              : 'Sửa quy trình'
                          }
                          onClick={() => loadConfigForEdit(cfg)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          disabled={cfg.is_active}
                          title={
                            cfg.is_active
                              ? 'Vui lòng chuyển sang Tạm dừng để thực hiện xóa'
                              : 'Xóa quy trình'
                          }
                          onClick={() => setConfirmDelete(cfg)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Delete Confirm ── */}
      <Dialog
        open={!!confirmDelete}
        onOpenChange={(v) => {
          if (!v) setConfirmDelete(null)
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{`Xác nhận xóa`}</DialogTitle>
            <DialogDescription>
              {`Xóa "`}
              <strong>{confirmDelete?.name}</strong>
              {`"? Không thể hoàn tác.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>{`Hủy`}</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!confirmDelete) return
                deleteMut.mutate(confirmDelete.id, {
                  onSuccess: () => {
                    toast.success('Đã xóa')
                    setConfirmDelete(null)
                  },
                  onError: (err) => toast.error(getErrorMessage(err, 'Xóa thất bại')),
                })
              }}
            >{`Xóa`}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create / Edit Dialog ── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v)
          if (!v) setEditingId(null)
        }}
      >
        <DialogContent className="sm:max-w-[680px] max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingId ? <Pencil className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
              {editingId ? 'Sửa quy trình phê duyệt' : 'Tạo quy trình phê duyệt'}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Chỉnh sửa các bước duyệt và thông tin quy trình'
                : 'Định nghĩa các bước duyệt cho module nghiệp vụ'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{`Tên *`}</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Duyệt tạm ứng IMPC"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Module</Label>
                <Select value={moduleCode} onValueChange={setModuleCode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn module" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODULES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{`Loại đối tượng *`}</Label>
                <Select value={entityType} onValueChange={setEntityType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn loại" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{`Mô tả`}</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>

            {/* Threshold */}
            <div className="rounded-lg border p-3 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={thresholdEnabled}
                  onChange={(e) => setThresholdEnabled(e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                <span className="text-sm font-semibold">{`Ngưỡng tiền (Threshold)`}</span>
              </label>
              {thresholdEnabled && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <Label className="text-xs">{'Dưới mức này → tự duyệt'}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        inputMode="numeric"
                        value={fmtMoney(thresholdLow)}
                        onChange={(e) => setThresholdLow(parseMoney(e.target.value))}
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {'VNĐ'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{'Dưới mức này → chỉ 2 bước đầu'}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        inputMode="numeric"
                        value={fmtMoney(thresholdHigh)}
                        onChange={(e) => setThresholdHigh(parseMoney(e.target.value))}
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {'VNĐ'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Steps */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{`Các bước phê duyệt`}</p>
                <Button variant="outline" size="sm" onClick={addStep}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  {`Thêm bước`}
                </Button>
              </div>

              {/* Timeline Preview */}
              {steps.length > 0 && steps[0].approver_role && (
                <div className="flex items-center gap-1 flex-wrap py-2 px-3 rounded-lg border bg-muted/20">
                  {steps.map((s, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <div
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${s.is_mandatory ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-muted border-border text-muted-foreground'}`}
                      >
                        B{s.step_order}: {roleMap.get(s.approver_role) || s.approver_role || '?'}
                      </div>
                      {i < steps.length - 1 && (
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {steps.map((step, idx) => (
                <div key={idx} className="rounded-lg border p-3 bg-card space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-primary">{`Bước ${step.step_order}`}</span>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={step.is_mandatory}
                          onChange={(e) => updateStep(idx, 'is_mandatory', e.target.checked)}
                          className="h-3.5 w-3.5 rounded"
                        />
                        {`Bắt buộc`}
                      </label>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        disabled={steps.length <= 1}
                        onClick={() => removeStep(idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">{`Vai trò duyệt *`}</Label>
                      <Select
                        value={step.approver_role}
                        onValueChange={(v) => updateStep(idx, 'approver_role', v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Chọn" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeRoles.map((r) => (
                            <SelectItem key={r.role_code} value={r.role_code}>
                              {r.role_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{`Số người`}</Label>
                      <Input
                        type="number"
                        min={1}
                        className="h-8 text-xs"
                        value={step.required_count}
                        onChange={(e) =>
                          updateStep(idx, 'required_count', parseInt(e.target.value) || 1)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{`Timeout (giờ)`}</Label>
                      <Input
                        type="number"
                        className="h-8 text-xs"
                        value={step.timeout_hours}
                        onChange={(e) => updateStep(idx, 'timeout_hours', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{`Cấp phó (thay thế)`}</Label>
                      <Select
                        value={step.alternative_approver_id || '__none__'}
                        onValueChange={(v) =>
                          updateStep(idx, 'alternative_approver_id', v === '__none__' ? '' : v)
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Không" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">{`Không có`}</SelectItem>
                          {activeRoles.map((r) => (
                            <SelectItem key={r.role_code} value={r.role_code}>
                              {r.role_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {'Hủy'}
            </Button>
            <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
              {(createMut.isPending || updateMut.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingId ? 'Lưu thay đổi' : 'Tạo quy trình'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
