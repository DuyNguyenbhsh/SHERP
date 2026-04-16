import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useCreateCustomer,
  useUpdateCustomer,
  CUSTOMER_TYPE_LABELS,
  CUSTOMER_PAYMENT_TERM_LABELS,
  type Customer,
  type CreateCustomerPayload,
  type CustomerType,
  type CustomerPaymentTerm,
} from '@/entities/customer'
import { getErrorMessage } from '@/shared/api/axios'

interface Props {
  open: boolean
  onClose: () => void
  initial?: Customer | null
}

const EMPTY: CreateCustomerPayload = {
  name: '',
  customer_type: 'RETAIL',
  payment_term: 'COD',
  credit_limit: 0,
}

export function CustomerFormDialog({ open, onClose, initial }: Props): React.JSX.Element {
  const isEdit = Boolean(initial)
  const [form, setForm] = useState<CreateCustomerPayload>(EMPTY)
  const createMut = useCreateCustomer()
  const updateMut = useUpdateCustomer()

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name,
        short_name: initial.short_name ?? '',
        tax_code: initial.tax_code ?? '',
        customer_type: initial.customer_type,
        primary_contact: initial.primary_contact ?? '',
        primary_phone: initial.primary_phone ?? '',
        primary_email: initial.primary_email ?? '',
        billing_address: initial.billing_address ?? '',
        shipping_address: initial.shipping_address ?? '',
        payment_term: initial.payment_term,
        credit_limit: Number(initial.credit_limit),
        notes: initial.notes ?? '',
      })
    } else {
      setForm(EMPTY)
    }
  }, [initial, open])

  const update = <K extends keyof CreateCustomerPayload>(k: K, v: CreateCustomerPayload[K]): void =>
    setForm((p) => ({ ...p, [k]: v }))

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Tên khách hàng là bắt buộc')
      return
    }

    if (isEdit && initial) {
      updateMut.mutate(
        { id: initial.id, data: form },
        {
          onSuccess: () => {
            toast.success(`Cập nhật "${form.name}" thành công`)
            onClose()
          },
          onError: (err) => toast.error(getErrorMessage(err, 'Cập nhật thất bại')),
        },
      )
    } else {
      createMut.mutate(form, {
        onSuccess: () => {
          toast.success(`Tạo "${form.name}" thành công`)
          onClose()
        },
        onError: (err) => toast.error(getErrorMessage(err, 'Tạo mới thất bại')),
      })
    }
  }

  const loading = createMut.isPending || updateMut.isPending

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Sửa khách hàng' : 'Thêm khách hàng mới'}</DialogTitle>
          <DialogDescription>Mã KH tự sinh theo pattern CUS-YYMMDD-XXX.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Tên pháp nhân *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Loại KH</Label>
              <Select
                value={form.customer_type}
                onValueChange={(v) => update('customer_type', v as CustomerType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CUSTOMER_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tax">Mã số thuế</Label>
              <Input
                id="tax"
                value={form.tax_code ?? ''}
                onChange={(e) => update('tax_code', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="contact">Người liên hệ</Label>
              <Input
                id="contact"
                value={form.primary_contact ?? ''}
                onChange={(e) => update('primary_contact', e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Điện thoại</Label>
              <Input
                id="phone"
                value={form.primary_phone ?? ''}
                onChange={(e) => update('primary_phone', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.primary_email ?? ''}
                onChange={(e) => update('primary_email', e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Điều khoản thanh toán</Label>
              <Select
                value={form.payment_term}
                onValueChange={(v) => update('payment_term', v as CustomerPaymentTerm)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CUSTOMER_PAYMENT_TERM_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="limit">Hạn mức công nợ</Label>
              <Input
                id="limit"
                type="number"
                min={0}
                value={form.credit_limit ?? 0}
                onChange={(e) => update('credit_limit', Number(e.target.value))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="billing">Địa chỉ xuất hóa đơn</Label>
            <Textarea
              id="billing"
              rows={2}
              value={form.billing_address ?? ''}
              onChange={(e) => update('billing_address', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="shipping">Địa chỉ giao hàng</Label>
            <Textarea
              id="shipping"
              rows={2}
              value={form.shipping_address ?? ''}
              onChange={(e) => update('shipping_address', e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
