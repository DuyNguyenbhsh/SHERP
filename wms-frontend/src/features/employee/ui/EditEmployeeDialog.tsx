import { useEffect, useState } from 'react'
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

import { useUpdateEmployee, type Employee } from '@/entities/employee'
import { useOrganizations } from '@/entities/organization'
import { getErrorMessage } from '@/shared/api/axios'

const formSchema = z.object({
  full_name: z.string().min(1, 'Không được để trống').max(100),
  email: z.string().email('Email không đúng').max(100).or(z.literal('')).optional(),
  phone_number: z.string().max(20).optional(),
  job_title: z.string().max(50).optional(),
  organization_id: z.string().uuid('Phải chọn phòng ban'),
})

type FormValues = z.infer<typeof formSchema>

interface EditEmployeeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee: Employee | null
}

export function EditEmployeeDialog({
  open,
  onOpenChange,
  employee,
}: EditEmployeeDialogProps): React.JSX.Element {
  const { data: organizations, isLoading: orgsLoading } = useOrganizations()
  const updateMutation = useUpdateEmployee()
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  })

  useEffect(() => {
    if (employee && open) {
      reset({
        full_name: employee.full_name,
        email: employee.email ?? '',
        phone_number: employee.phone ?? '',
        job_title: employee.job_title ?? '',
        organization_id: employee.department?.id ?? '',
      })
    }
  }, [employee, open, reset])

  const onSubmit = (values: FormValues): void => {
    if (!employee) return
    setSubmitting(true)
    updateMutation.mutate(
      {
        id: employee.id,
        data: {
          full_name: values.full_name,
          email: values.email || undefined,
          phone_number: values.phone_number || undefined,
          job_title: values.job_title || undefined,
          organization_id: values.organization_id,
        },
      },
      {
        onSuccess: () => {
          toast.success('Cập nhật nhân viên thành công')
          onOpenChange(false)
        },
        onError: (err) => {
          toast.error(getErrorMessage(err, 'Cập nhật thất bại'))
        },
        onSettled: () => setSubmitting(false),
      },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!submitting) onOpenChange(v)
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Sửa thông tin nhân viên</DialogTitle>
          <DialogDescription>
            Mã NV: <strong>{employee?.employee_code}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit_full_name">Họ và tên *</Label>
            <Input id="edit_full_name" {...register('full_name')} />
            {errors.full_name && (
              <p className="text-sm text-destructive">{errors.full_name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit_email">Email</Label>
              <Input id="edit_email" type="email" {...register('email')} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit_phone">Số điện thoại</Label>
              <Input id="edit_phone" {...register('phone_number')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit_job_title">Chức vụ</Label>
            <Input id="edit_job_title" {...register('job_title')} />
          </div>

          <div className="space-y-1.5">
            <Label>Phòng ban *</Label>
            <Select
              value={employee?.department?.id}
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
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
