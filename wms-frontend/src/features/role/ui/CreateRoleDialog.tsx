import { useState } from 'react'
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
import { useCreateRole } from '@/entities/role'
import { getErrorMessage } from '@/shared/api/axios'

const formSchema = z.object({
  role_code: z
    .string()
    .min(2, 'Tối thiểu 2 ký tự')
    .regex(/^[A-Z_]+$/, 'Chỉ cho phép chữ IN HOA và dấu _'),
  role_name: z.string().min(2, 'Tối thiểu 2 ký tự'),
  description: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface CreateRoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateRoleDialog({ open, onOpenChange }: CreateRoleDialogProps): React.JSX.Element {
  const createMutation = useCreateRole()
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  })

  const onSubmit = (values: FormValues): void => {
    setSubmitting(true)
    createMutation.mutate(values, {
      onSuccess: () => {
        toast.success('Tạo vai trò thành công')
        reset()
        onOpenChange(false)
      },
      onError: (err) => toast.error(getErrorMessage(err, 'Tạo vai trò thất bại')),
      onSettled: () => setSubmitting(false),
    })
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
          <DialogTitle>Tạo vai trò mới</DialogTitle>
          <DialogDescription>Thêm nhóm quyền mới vào hệ thống</DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="cr-code">Mã quyền *</Label>
            <Input id="cr-code" placeholder="VD: SITE_ENGINEER" {...register('role_code')} />
            {errors.role_code && (
              <p className="text-sm text-destructive">{errors.role_code.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cr-name">Tên nhóm quyền *</Label>
            <Input id="cr-name" placeholder="VD: Kỹ sư công trường" {...register('role_name')} />
            {errors.role_name && (
              <p className="text-sm text-destructive">{errors.role_name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cr-desc">Mô tả</Label>
            <Textarea
              id="cr-desc"
              placeholder="Mô tả ngắn gọn về vai trò"
              rows={3}
              {...register('description')}
            />
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
              Tạo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
