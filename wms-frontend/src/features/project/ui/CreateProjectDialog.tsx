import { useState, useCallback } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
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
import { useCreateProject, checkProjectCode } from '@/entities/project'
import { useOrganizations } from '@/entities/organization'
import { useEmployees } from '@/entities/employee'
import { useSuppliers } from '@/entities/project/api/useSuppliers'

const formSchema = z.object({
  project_code: z.string().min(1, 'Mã dự án không được để trống').max(50),
  project_name: z.string().min(1, 'Tên dự án không được để trống').max(255),
  description: z.string().max(1000).optional(),
  organization_id: z.string().uuid().optional().or(z.literal('')),
  stage: z.enum(['PLANNING', 'PERMITTING', 'CONSTRUCTION', 'MANAGEMENT']).optional(),
  status: z
    .enum([
      'DRAFT',
      'BIDDING',
      'WON_BID',
      'LOST_BID',
      'ACTIVE',
      'ON_HOLD',
      'SETTLING',
      'SETTLED',
      'WARRANTY',
      'RETENTION_RELEASED',
      'CANCELED',
    ])
    .optional(),
  location: z.string().max(255).optional(),
  gfa_m2: z.coerce.number().min(0, 'GFA không được âm').optional().or(z.literal('')),
  // Master Data FKs
  investor_id: z.string().uuid().optional().or(z.literal('')),
  manager_id: z.string().uuid().optional().or(z.literal('')),
  department_id: z.string().uuid().optional().or(z.literal('')),
  budget: z.coerce.number().min(0, 'Ngân sách không được âm').optional().or(z.literal('')),
})

type FormValues = z.infer<typeof formSchema>

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
  const { data: organizations, isLoading: orgsLoading } = useOrganizations()
  const { data: employees, isLoading: empsLoading } = useEmployees()
  const { data: suppliers, isLoading: suppLoading } = useSuppliers()
  const createMutation = useCreateProject()
  const [submitting, setSubmitting] = useState(false)
  const [codeStatus, setCodeStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [codeChecking, setCodeChecking] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as unknown as Resolver<FormValues>,
    defaultValues: {
      project_code: '',
      project_name: '',
      description: '',
      organization_id: '',
      stage: 'PLANNING',
      status: 'DRAFT',
      location: '',
      gfa_m2: '' as unknown as undefined,
      investor_id: '',
      manager_id: '',
      department_id: '',
      budget: '' as unknown as undefined,
    },
  })

  const handleCodeBlur = useCallback(async (e: React.FocusEvent<HTMLInputElement>) => {
    const code = e.target.value.trim()
    if (!code) {
      setCodeStatus('idle')
      return
    }
    setCodeStatus('checking')
    setCodeChecking(true)
    try {
      const exists = await checkProjectCode(code)
      setCodeStatus(exists ? 'taken' : 'available')
    } catch {
      setCodeStatus('idle')
    } finally {
      setCodeChecking(false)
    }
  }, [])

  const onSubmit = (values: FormValues): void => {
    if (codeStatus === 'taken') {
      toast.error('Mã dự án đã tồn tại trong hệ thống. Vui lòng chọn mã khác.')
      return
    }
    setSubmitting(true)
    createMutation.mutate(
      {
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
      },
      {
        onSuccess: () => {
          toast.success('Tạo dự án thành công')
          reset()
          setCodeStatus('idle')
          onOpenChange(false)
        },
        onError: (err: unknown) => {
          toast.error(getErrorMessage(err, 'Tạo dự án thất bại'))
        },
        onSettled: () => setSubmitting(false),
      },
    )
  }

  const handleClose = (isOpen: boolean): void => {
    if (!submitting) {
      if (!isOpen) {
        reset()
        setCodeStatus('idle')
      }
      onOpenChange(isOpen)
    }
  }

  const isCodeBlocked = codeStatus === 'taken'

  // Filter active employees for PM selector
  const activeEmployees = (employees ?? []).filter((e) => e.status === 'ACTIVE')

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[580px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo dự án mới</DialogTitle>
          <DialogDescription>
            Nhập thông tin dự án. Các trường có dấu * là bắt buộc.
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

            {/* ── TAB 1: Thông tin cơ bản ── */}
            <TabsContent value="basic" className="space-y-4 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="project_code">Mã dự án *</Label>
                  <div className="relative">
                    <Input
                      id="project_code"
                      placeholder="VD: PRJ-001"
                      className={
                        isCodeBlocked
                          ? 'border-red-400 pr-8'
                          : codeStatus === 'available'
                            ? 'border-green-400 pr-8'
                            : ''
                      }
                      {...register('project_code', { onChange: () => setCodeStatus('idle') })}
                      onBlur={(e) => {
                        void handleCodeBlur(e)
                      }}
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      {codeChecking && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                      {codeStatus === 'available' && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                      {codeStatus === 'taken' && <XCircle className="h-4 w-4 text-red-500" />}
                    </div>
                  </div>
                  {errors.project_code && (
                    <p className="text-sm text-destructive">{errors.project_code.message}</p>
                  )}
                  {codeStatus === 'taken' && (
                    <p className="text-sm text-red-500 font-medium">
                      Mã dự án đã tồn tại trong hệ thống. Vui lòng chọn mã khác.
                    </p>
                  )}
                  {codeStatus === 'available' && (
                    <p className="text-sm text-green-600">Mã khả dụng</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="project_name">Tên dự án *</Label>
                  <Input
                    id="project_name"
                    placeholder="VD: Khu đô thị SH Central"
                    {...register('project_name')}
                  />
                  {errors.project_name && (
                    <p className="text-sm text-destructive">{errors.project_name.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Mô tả</Label>
                <Input id="description" placeholder="Mô tả dự án..." {...register('description')} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tổ chức quản lý</Label>
                  <Select
                    onValueChange={(val) =>
                      setValue('organization_id', val, { shouldValidate: true })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={orgsLoading ? 'Đang tải...' : 'Chọn tổ chức'} />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations?.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.organization_name} ({org.organization_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Giai đoạn IMPC</Label>
                  <Select
                    defaultValue="PLANNING"
                    onValueChange={(val) =>
                      setValue('stage', val as FormValues['stage'], { shouldValidate: true })
                    }
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
                    defaultValue="DRAFT"
                    onValueChange={(val) =>
                      setValue('status', val as FormValues['status'], { shouldValidate: true })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Nháp</SelectItem>
                      <SelectItem value="BIDDING">Đang đấu thầu</SelectItem>
                      <SelectItem value="ACTIVE">Đang triển khai</SelectItem>
                      <SelectItem value="ON_HOLD">Tạm dừng</SelectItem>
                      <SelectItem value="SETTLING">Đang quyết toán</SelectItem>
                      <SelectItem value="CANCELED">Hủy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="location">Địa điểm</Label>
                  <Input id="location" placeholder="VD: Quận 2, TP.HCM" {...register('location')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gfa_m2">GFA (m²)</Label>
                  <Input
                    id="gfa_m2"
                    type="number"
                    step="0.01"
                    placeholder="15000"
                    {...register('gfa_m2')}
                  />
                  {errors.gfa_m2 && (
                    <p className="text-sm text-destructive">{errors.gfa_m2.message}</p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ── TAB 2: Thông tin bổ sung (Master Data Selects) ── */}
            <TabsContent value="extra" className="space-y-4 pt-3">
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 p-4 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Thông tin bổ sung
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Chủ đầu tư</Label>
                    <Select
                      onValueChange={(val) =>
                        setValue('investor_id', val, { shouldValidate: true })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={suppLoading ? 'Đang tải...' : 'Chọn chủ đầu tư'}
                        />
                      </SelectTrigger>
                      <SelectContent>
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
                      onValueChange={(val) => setValue('manager_id', val, { shouldValidate: true })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={empsLoading ? 'Đang tải...' : 'Chọn giám đốc DA'}
                        />
                      </SelectTrigger>
                      <SelectContent>
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
                      onValueChange={(val) =>
                        setValue('department_id', val, { shouldValidate: true })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={orgsLoading ? 'Đang tải...' : 'Chọn phòng ban'} />
                      </SelectTrigger>
                      <SelectContent>
                        {organizations?.map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.organization_name} ({org.organization_code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="budget">Ngân sách (VNĐ)</Label>
                    <Input
                      id="budget"
                      type="number"
                      step="1"
                      placeholder="50000000000"
                      {...register('budget')}
                    />
                    {errors.budget && (
                      <p className="text-sm text-destructive">{errors.budget.message}</p>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={submitting || isCodeBlocked}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Tạo dự án
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
