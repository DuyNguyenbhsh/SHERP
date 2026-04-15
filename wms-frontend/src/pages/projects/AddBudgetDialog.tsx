import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { getErrorMessage } from '@/shared/api/axios'
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
import { useCostCategories, useUpsertBudget } from '@/entities/project'

const budgetSchema = z.object({
  category_id: z.string().uuid('Chọn loại chi phí'),
  planned_amount: z.coerce.number().min(0, 'Không được âm'),
  notes: z.string().max(500).optional(),
})

type BudgetForm = z.infer<typeof budgetSchema>

export interface AddBudgetDialogProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  projectId: string
}

export function AddBudgetDialog({
  open,
  onOpenChange,
  projectId,
}: AddBudgetDialogProps): React.JSX.Element {
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

  const onSubmit = (v: BudgetForm): void => {
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
