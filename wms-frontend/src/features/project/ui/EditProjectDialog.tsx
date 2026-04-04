import { useState, useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, AlertTriangle } from 'lucide-react'
import { getErrorMessage } from '@/shared/api/axios'

import { Button } from '@/components/ui/button'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useUpdateProject } from '@/entities/project'
import type { Project } from '@/entities/project'
import { useOrganizations } from '@/entities/organization'
import { useEmployees } from '@/entities/employee'
import { useSuppliers } from '@/entities/project/api/useSuppliers'

const formSchema = z.object({
  project_code: z.string().min(1, 'Mã dự án không được để trống').max(50),
  project_name: z.string().min(1, 'Tên dự án không được để trống').max(255),
  description: z.string().max(1000).optional(),
  organization_id: z.string().uuid().optional().or(z.literal('')),
  stage: z.enum(['PLANNING', 'PERMITTING', 'CONSTRUCTION', 'MANAGEMENT']).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELED']).optional(),
  location: z.string().max(255).optional(),
  gfa_m2: z.coerce.number().min(0).optional().or(z.literal('')),
  investor_id: z.string().uuid().optional().or(z.literal('')),
  manager_id: z.string().uuid().optional().or(z.literal('')),
  department_id: z.string().uuid().optional().or(z.literal('')),
  budget: z.coerce.number().min(0).optional().or(z.literal('')),
})

type FormValues = z.infer<typeof formSchema>

const NONE = '__none__'

interface EditProjectDialogProps {
  project: Project | null
  onClose: () => void
}

export function EditProjectDialog({ project, onClose }: EditProjectDialogProps) {
  const { data: organizations, isLoading: orgsLoading } = useOrganizations()
  const { data: employees, isLoading: empsLoading } = useEmployees()
  const { data: suppliers, isLoading: suppLoading } = useSuppliers()
  const updateMutation = useUpdateProject()
  const [submitting, setSubmitting] = useState(false)

  // Reason popup state
  const [reasonPopup, setReasonPopup] = useState<{ fields: string[]; values: FormValues } | null>(
    null,
  )
  const [changeReason, setChangeReason] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as unknown as Resolver<FormValues>,
  })

  useEffect(() => {
    if (project) {
      reset({
        project_code: project.project_code,
        project_name: project.project_name,
        description: project.description ?? '',
        organization_id: project.organization_id ?? '',
        stage: project.stage,
        status: project.status,
        location: project.location ?? '',
        gfa_m2:
          project.gfa_m2 !== null && project.gfa_m2 !== undefined
            ? Number(project.gfa_m2)
            : ('' as unknown as undefined),
        investor_id: project.investor_id ?? '',
        manager_id: project.manager_id ?? '',
        department_id: project.department_id ?? '',
        budget:
          project.budget !== null && project.budget !== undefined
            ? Number(project.budget)
            : ('' as unknown as undefined),
      })
    }
  }, [project, reset])

  if (!project) return null

  const activeEmployees = (employees ?? []).filter((e) => e.status === 'ACTIVE')

  // Kiểm tra có trường nào yêu cầu lý do thay đổi không
  const detectSensitiveChanges = (values: FormValues): string[] => {
    const changed: string[] = []
    const budgetVal = typeof values.budget === 'number' ? values.budget : null
    const oldBudget =
      project.budget !== null && project.budget !== undefined ? Number(project.budget) : null
    if (budgetVal !== oldBudget) changed.push('Ngân sách')

    if ((values.manager_id || '') !== (project.manager_id ?? '')) changed.push('Giám đốc DA')

    return changed
  }

  const doSubmit = (values: FormValues, reason?: string) => {
    setSubmitting(true)
    updateMutation.mutate(
      {
        id: project.id,
        project_code: values.project_code,
        project_name: values.project_name,
        description: values.description || undefined,
        organization_id: values.organization_id || undefined,
        stage: values.stage,
        status: values.status,
        location: values.location || undefined,
        gfa_m2: typeof values.gfa_m2 === 'number' ? values.gfa_m2 : undefined,
        investor_id: values.investor_id || undefined,
        manager_id: values.manager_id || undefined,
        department_id: values.department_id || undefined,
        budget: typeof values.budget === 'number' ? values.budget : undefined,
        change_reason: reason,
      },
      {
        onSuccess: () => {
          toast.success('Cập nhật dự án thành công')
          setReasonPopup(null)
          onClose()
        },
        onError: (err: unknown) => {
          toast.error(getErrorMessage(err, 'Cập nhật thất bại'))
        },
        onSettled: () => setSubmitting(false),
      },
    )
  }

  const onSubmit = (values: FormValues): void => {
    const sensitiveFields = detectSensitiveChanges(values)
    if (sensitiveFields.length > 0) {
      // Mở popup yêu cầu lý do
      setReasonPopup({ fields: sensitiveFields, values })
      setChangeReason('')
    } else {
      doSubmit(values)
    }
  }

  const handleReasonConfirm = () => {
    if (!changeReason.trim()) {
      toast.error('Vui lòng nhập lý do thay đổi')
      return
    }
    if (reasonPopup) {
      doSubmit(reasonPopup.values, changeReason.trim())
    }
  }

  const selectVal = (v: string | null | undefined) => v || NONE

  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open && !submitting) onClose()
        }}
      >
        <DialogContent className="sm:max-w-[580px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sửa dự án</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin dự án <strong>{project.project_code}</strong>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-1 py-1">
            <Tabs defaultValue="basic">
              <TabsList className="w-full">
                <TabsTrigger value="basic" className="flex-1">
                  Thông tin cơ bản
                </TabsTrigger>
                <TabsTrigger value="extra" className="flex-1">
                  Thông tin bổ sung
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 pt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Mã dự án *</Label>
                    <Input {...register('project_code')} />
                    {errors.project_code && (
                      <p className="text-sm text-destructive">{errors.project_code.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tên dự án *</Label>
                    <Input {...register('project_name')} />
                    {errors.project_name && (
                      <p className="text-sm text-destructive">{errors.project_name.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Mô tả</Label>
                  <Input {...register('description')} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Tổ chức quản lý</Label>
                    <Select
                      defaultValue={selectVal(project.organization_id)}
                      onValueChange={(v) => setValue('organization_id', v === NONE ? '' : v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={orgsLoading ? 'Đang tải...' : 'Chọn'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>— Không chọn —</SelectItem>
                        {organizations?.map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.organization_name} ({o.organization_code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Giai đoạn IMPC</Label>
                    <Select
                      defaultValue={project.stage}
                      onValueChange={(v) => setValue('stage', v as FormValues['stage'])}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PLANNING">Planning</SelectItem>
                        <SelectItem value="PERMITTING">Permitting</SelectItem>
                        <SelectItem value="CONSTRUCTION">Construction</SelectItem>
                        <SelectItem value="MANAGEMENT">Management</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Trạng thái</Label>
                    <Select
                      defaultValue={project.status}
                      onValueChange={(v) => setValue('status', v as FormValues['status'])}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DRAFT">Nháp</SelectItem>
                        <SelectItem value="ACTIVE">Đang triển khai</SelectItem>
                        <SelectItem value="ON_HOLD">Tạm dừng</SelectItem>
                        <SelectItem value="COMPLETED">Hoàn thành</SelectItem>
                        <SelectItem value="CANCELED">Hủy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Địa điểm</Label>
                    <Input {...register('location')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>GFA (m²)</Label>
                    <Input type="number" step="0.01" {...register('gfa_m2')} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="extra" className="space-y-4 pt-3">
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 p-4 space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Thông tin bổ sung
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Chủ đầu tư</Label>
                      <Select
                        defaultValue={selectVal(project.investor_id)}
                        onValueChange={(v) => setValue('investor_id', v === NONE ? '' : v)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={suppLoading ? 'Đang tải...' : 'Chọn'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>— Không chọn —</SelectItem>
                          {suppliers?.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name} ({s.supplier_code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Giám đốc dự án</Label>
                      <Select
                        defaultValue={selectVal(project.manager_id)}
                        onValueChange={(v) => setValue('manager_id', v === NONE ? '' : v)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={empsLoading ? 'Đang tải...' : 'Chọn'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>— Không chọn —</SelectItem>
                          {activeEmployees.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.full_name} ({e.employee_code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Phòng ban quản lý</Label>
                      <Select
                        defaultValue={selectVal(project.department_id)}
                        onValueChange={(v) => setValue('department_id', v === NONE ? '' : v)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={orgsLoading ? 'Đang tải...' : 'Chọn'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>— Không chọn —</SelectItem>
                          {organizations?.map((o) => (
                            <SelectItem key={o.id} value={o.id}>
                              {o.organization_name} ({o.organization_code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Ngân sách (VNĐ)</Label>
                      <Input type="number" step="1" {...register('budget')} />
                      {errors.budget && (
                        <p className="text-sm text-destructive">{errors.budget.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Hủy
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Lưu thay đổi
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Popup yêu cầu lý do thay đổi ── */}
      {reasonPopup && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setReasonPopup(null)
          }}
        >
          <DialogContent className="sm:max-w-[440px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Yêu cầu lý do thay đổi
              </DialogTitle>
              <DialogDescription>
                Bạn đang thay đổi: <strong>{reasonPopup.fields.join(', ')}</strong>. Đây là thông
                tin quan trọng — vui lòng nhập lý do để lưu vào lịch sử dự án.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5 py-2">
              <Label htmlFor="change_reason">Lý do thay đổi *</Label>
              <Input
                id="change_reason"
                placeholder="VD: Theo quyết định số 123/QĐ ngày 15/03/2026"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                autoFocus
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setReasonPopup(null)}>
                Hủy
              </Button>
              <Button onClick={handleReasonConfirm} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Xác nhận & Lưu
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
