import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

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

import { useCreateEmployee } from '@/entities/employee/api/useCreateEmployee'
import { useOrganizations } from '@/entities/organization'

const formSchema = z.object({
  employee_code: z.string().min(1, 'Mã nhân viên không được để trống').max(50),
  full_name: z.string().min(1, 'Họ và tên không được để trống').max(100),
  email: z.string().email('Email không đúng định dạng').max(100).or(z.literal('')).optional(),
  phone_number: z.string().max(20).optional(),
  job_title: z.string().max(50).optional(),
  organization_id: z.string().uuid('Phải chọn Phòng ban'),
})

type FormValues = z.infer<typeof formSchema>

interface CreateEmployeeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateEmployeeDialog({
  open,
  onOpenChange,
}: CreateEmployeeDialogProps): React.JSX.Element {
  const { data: organizations, isLoading: orgsLoading } = useOrganizations()
  const createMutation = useCreateEmployee()
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employee_code: '',
      full_name: '',
      email: '',
      phone_number: '',
      job_title: '',
      organization_id: '',
    },
  })

  const onSubmit = (values: FormValues): void => {
    setSubmitting(true)
    const payload = {
      ...values,
      email: values.email || undefined,
      phone_number: values.phone_number || undefined,
      job_title: values.job_title || undefined,
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('Tạo nhân viên thành công')
        reset()
        onOpenChange(false)
      },
      onError: () => {
        toast.error('Tạo nhân viên thất bại')
      },
      onSettled: () => {
        setSubmitting(false)
      },
    })
  }

  const handleClose = (isOpen: boolean): void => {
    if (!submitting) {
      if (!isOpen) reset()
      onOpenChange(isOpen)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Thêm nhân viên mới</DialogTitle>
          <DialogDescription>
            Nhập thông tin nhân viên. Các trường có dấu * là bắt buộc.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4 py-2">
          {/* Mã nhân viên */}
          <div className="space-y-1.5">
            <Label htmlFor="employee_code">Mã nhân viên *</Label>
            <Input id="employee_code" placeholder="VD: EMP-006" {...register('employee_code')} />
            {errors.employee_code && (
              <p className="text-sm text-destructive">{errors.employee_code.message}</p>
            )}
          </div>

          {/* Họ tên */}
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Họ và tên *</Label>
            <Input id="full_name" placeholder="VD: Nguyễn Văn A" {...register('full_name')} />
            {errors.full_name && (
              <p className="text-sm text-destructive">{errors.full_name.message}</p>
            )}
          </div>

          {/* Email + SĐT — 2 cột */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@company.com"
                {...register('email')}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone_number">Số điện thoại</Label>
              <Input id="phone_number" placeholder="0909..." {...register('phone_number')} />
            </div>
          </div>

          {/* Chức vụ */}
          <div className="space-y-1.5">
            <Label htmlFor="job_title">Chức vụ</Label>
            <Input id="job_title" placeholder="VD: Thủ kho, Kế toán" {...register('job_title')} />
          </div>

          {/* Phòng ban — Select */}
          <div className="space-y-1.5">
            <Label>Phòng ban *</Label>
            <Select
              onValueChange={(val) => setValue('organization_id', val, { shouldValidate: true })}
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
            {errors.organization_id && (
              <p className="text-sm text-destructive">{errors.organization_id.message}</p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={submitting}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Tạo nhân viên
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
