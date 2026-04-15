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
import { useCostCategories, useCreateTransaction } from '@/entities/project'

const txSchema = z.object({
  category_id: z.string().uuid('Chọn loại chi phí'),
  amount: z.coerce.number().min(0, 'Số tiền không được âm'),
  transaction_date: z.string().min(1, 'Chọn ngày'),
  description: z.string().max(255).optional(),
  reference_type: z.string().max(50).optional(),
  reference_id: z.string().max(50).optional(),
})

type TxForm = z.infer<typeof txSchema>

export interface AddTransactionDialogProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  projectId: string
}

export function AddTransactionDialog({
  open,
  onOpenChange,
  projectId,
}: AddTransactionDialogProps): React.JSX.Element {
  const { data: categories } = useCostCategories()
  const createMut = useCreateTransaction()
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(txSchema),
    defaultValues: {
      category_id: '',
      amount: '' as unknown as number,
      transaction_date: new Date().toISOString().split('T')[0],
      description: '',
      reference_type: '',
      reference_id: '',
    },
  })

  const onSubmit = (v: TxForm): void => {
    setSubmitting(true)
    createMut.mutate(
      {
        project_id: projectId,
        category_id: v.category_id,
        amount: v.amount,
        transaction_date: v.transaction_date,
        description: v.description || undefined,
        reference_type: v.reference_type || undefined,
        reference_id: v.reference_id || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Tạo giao dịch thành công')
          reset()
          onOpenChange(false)
        },
        onError: (err: unknown) => toast.error(getErrorMessage(err, 'Tạo giao dịch thất bại')),
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
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Thêm khoản chi</DialogTitle>
          <DialogDescription>Ghi nhận chi phí thực tế của dự án</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
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
              <Label htmlFor="tx_amount">Số tiền (VNĐ) *</Label>
              <Input
                id="tx_amount"
                type="number"
                step="1"
                placeholder="5000000000"
                {...register('amount')}
              />
              {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tx_desc">Mô tả</Label>
            <Input
              id="tx_desc"
              placeholder="VD: Thanh toán đợt 1 nhà thầu XD"
              {...register('description')}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tx_date">Ngày *</Label>
              <Input id="tx_date" type="date" {...register('transaction_date')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx_ref_type">Loại chứng từ</Label>
              <Select onValueChange={(v) => setValue('reference_type', v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PO_INVOICE">Hóa đơn PO</SelectItem>
                  <SelectItem value="WMS_EXPORT">Phiếu xuất kho</SelectItem>
                  <SelectItem value="MANUAL">Nhập tay</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx_ref_id">Số chứng từ</Label>
              <Input id="tx_ref_id" placeholder="INV-001" {...register('reference_id')} />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Tạo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
