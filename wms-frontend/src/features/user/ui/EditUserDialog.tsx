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

import { useUpdateUser, type User } from '@/entities/user'
import { useRoles } from '@/entities/role/api/useRoles'
import { getErrorMessage } from '@/shared/api/axios'

const formSchema = z.object({
  role_id: z.string().uuid('Phải chọn vai trò'),
  password: z.string().min(6, 'Tối thiểu 6 ký tự').or(z.literal('')).optional(),
})

type FormValues = z.infer<typeof formSchema>

interface EditUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
}

export function EditUserDialog({
  open,
  onOpenChange,
  user,
}: EditUserDialogProps): React.JSX.Element {
  const { data: roles, isLoading: rolesLoading } = useRoles()
  const updateMutation = useUpdateUser()
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
    if (user && open) {
      const currentRoleId = user.userRoles[0]?.role?.id ?? ''
      reset({ role_id: currentRoleId, password: '' })
    }
  }, [user, open, reset])

  const onSubmit = (values: FormValues): void => {
    if (!user) return
    setSubmitting(true)

    const payload: Record<string, unknown> = { role_id: values.role_id }
    if (values.password && values.password.trim()) {
      payload.password = values.password
    }

    updateMutation.mutate(
      { id: user.id, data: payload },
      {
        onSuccess: () => {
          toast.success(`Cập nhật tài khoản ${user.username} thành công`)
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
          <DialogTitle>Sửa tài khoản</DialogTitle>
          <DialogDescription>
            Tài khoản: <strong>{user?.username}</strong>
            {user?.employee ? ` — ${user.employee.full_name}` : ''}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4 py-2">
          {/* Thông tin nhân viên (chỉ đọc) */}
          {user?.employee && (
            <div className="rounded-md border bg-muted/50 p-3 text-sm space-y-1">
              <p>
                <span className="font-medium">Mã NV:</span> {user.employee.employee_code}
              </p>
              <p>
                <span className="font-medium">Họ tên:</span> {user.employee.full_name}
              </p>
              <p>
                <span className="font-medium">Email:</span> {user.employee.email ?? '—'}
              </p>
            </div>
          )}

          {/* Vai trò */}
          <div className="space-y-1.5">
            <Label>Vai trò *</Label>
            <Select
              defaultValue={user?.userRoles[0]?.role?.id}
              onValueChange={(val) => setValue('role_id', val, { shouldValidate: true })}
            >
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

          {/* Mật khẩu mới (để trống = không đổi) */}
          <div className="space-y-1.5">
            <Label htmlFor="eu-password">
              Mật khẩu mới{' '}
              <span className="text-muted-foreground font-normal">(bỏ trống nếu không đổi)</span>
            </Label>
            <Input
              id="eu-password"
              type="password"
              placeholder="Để trống nếu không thay đổi"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
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
