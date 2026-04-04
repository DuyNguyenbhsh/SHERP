import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, UserPlus } from 'lucide-react'

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

import { useCreateUser } from '@/entities/user'
import { useUnlinkedEmployees } from '@/entities/employee'
import { useRoles } from '@/entities/role/api/useRoles'
import { getErrorMessage } from '@/shared/api/axios'

const formSchema = z.object({
  employee_id: z.string().uuid('Phải chọn nhân viên'),
  username: z.string().min(1, 'Tên đăng nhập không được để trống').max(100),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  role_id: z.string().uuid('Phải chọn vai trò'),
})

type FormValues = z.infer<typeof formSchema>

interface CreateUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps): React.JSX.Element {
  const { data: unlinkedEmployees, isLoading: empsLoading } = useUnlinkedEmployees()
  const { data: roles, isLoading: rolesLoading } = useRoles()
  const createMutation = useCreateUser()
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employee_id: '',
      username: '',
      password: '',
      role_id: '',
    },
  })

  const selectedEmpId = useWatch({ control, name: 'employee_id' })

  const selectedEmployee = unlinkedEmployees?.find((e) => e.id === selectedEmpId) ?? null

  const onSubmit = (values: FormValues): void => {
    setSubmitting(true)
    createMutation.mutate(values, {
      onSuccess: () => {
        const empName = selectedEmployee?.full_name ?? ''
        const roleName = roles?.find((r) => r.id === values.role_id)?.role_name ?? ''
        toast.success(`Đã tạo tài khoản cho nhân viên ${empName} với vai trò ${roleName}`)
        reset()
        onOpenChange(false)
      },
      onError: (err) => {
        toast.error(getErrorMessage(err, 'Tạo tài khoản thất bại'))
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
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Tạo tài khoản mới
          </DialogTitle>
          <DialogDescription>
            Chọn nhân viên từ danh sách và cấp tài khoản đăng nhập. Các trường có dấu * là bắt buộc.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4 py-2">
          {/* Chọn Nhân viên */}
          <div className="space-y-1.5">
            <Label>Nhân viên *</Label>
            <Select onValueChange={(val) => setValue('employee_id', val, { shouldValidate: true })}>
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={empsLoading ? 'Đang tải...' : 'Chọn nhân viên chưa có tài khoản'}
                />
              </SelectTrigger>
              <SelectContent>
                {unlinkedEmployees?.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.employee_code} — {emp.full_name}
                    {emp.department ? ` (${emp.department.organization_name})` : ''}
                  </SelectItem>
                ))}
                {!empsLoading && (!unlinkedEmployees || unlinkedEmployees.length === 0) && (
                  <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                    Tất cả nhân viên đã có tài khoản
                  </div>
                )}
              </SelectContent>
            </Select>
            {errors.employee_id && (
              <p className="text-sm text-destructive">{errors.employee_id.message}</p>
            )}
          </div>

          {/* Thông tin nhân viên đã chọn */}
          {selectedEmployee && (
            <div className="rounded-md border bg-muted/50 p-3 text-sm space-y-1">
              <p>
                <span className="font-medium">Họ tên:</span> {selectedEmployee.full_name}
              </p>
              <p>
                <span className="font-medium">Email:</span> {selectedEmployee.email ?? '—'}
              </p>
              <p>
                <span className="font-medium">Phòng ban:</span>{' '}
                {selectedEmployee.department?.organization_name ?? '—'}
              </p>
            </div>
          )}

          {/* Tên đăng nhập */}
          <div className="space-y-1.5">
            <Label htmlFor="cu-username">Tên đăng nhập *</Label>
            <Input id="cu-username" placeholder="VD: nguyenvana" {...register('username')} />
            {errors.username && (
              <p className="text-sm text-destructive">{errors.username.message}</p>
            )}
          </div>

          {/* Mật khẩu */}
          <div className="space-y-1.5">
            <Label htmlFor="cu-password">Mật khẩu *</Label>
            <Input
              id="cu-password"
              type="password"
              placeholder="Tối thiểu 6 ký tự"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          {/* Vai trò */}
          <div className="space-y-1.5">
            <Label>Vai trò *</Label>
            <Select onValueChange={(val) => setValue('role_id', val, { shouldValidate: true })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={rolesLoading ? 'Đang tải...' : 'Chọn vai trò'} />
              </SelectTrigger>
              <SelectContent>
                {roles
                  ?.filter((r) => r.is_active)
                  .map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.role_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {errors.role_id && <p className="text-sm text-destructive">{errors.role_id.message}</p>}
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
              Tạo tài khoản
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
