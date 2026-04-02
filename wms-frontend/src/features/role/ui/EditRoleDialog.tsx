import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useUpdateRole, type Role } from '@/entities/role'
import { getErrorMessage } from '@/shared/api/axios'

const formSchema = z.object({
  role_name: z.string().min(2, 'Tối thiểu 2 ký tự'),
  description: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface EditRoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: Role | null
}

export function EditRoleDialog({
  open,
  onOpenChange,
  role,
}: EditRoleDialogProps): React.JSX.Element {
  const updateMutation = useUpdateRole()
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  })

  useEffect(() => {
    if (role && open) {
      reset({ role_name: role.role_name, description: role.description ?? '' })
    }
  }, [role, open, reset])

  const onSubmit = (values: FormValues): void => {
    if (!role) return
    setSubmitting(true)
    updateMutation.mutate(
      { id: role.id, data: values },
      {
        onSuccess: () => {
          toast.success(`Cập nhật vai trò ${role.role_code} thành công`)
          onOpenChange(false)
        },
        onError: (err) => toast.error(getErrorMessage(err, 'Cập nhật thất bại')),
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
          <DialogTitle>Sửa vai trò</DialogTitle>
          <DialogDescription>
            Mã: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{role?.role_code}</code>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="er-name">Tên nhóm quyền *</Label>
            <Input id="er-name" {...register('role_name')} />
            {errors.role_name && (
              <p className="text-sm text-destructive">{errors.role_name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="er-desc">Mô tả</Label>
            <Textarea id="er-desc" rows={3} {...register('description')} />
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
