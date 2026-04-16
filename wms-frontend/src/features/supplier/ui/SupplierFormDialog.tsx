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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useCreateSupplier,
  useUpdateSupplier,
  SUPPLIER_TYPE_LABELS,
  PAYMENT_TERM_LABELS,
  type Supplier,
  type CreateSupplierPayload,
  type SupplierType,
  type PaymentTerm,
} from '@/entities/supplier'
import { getErrorMessage } from '@/shared/api/axios'

interface Props {
  open: boolean
  onClose: () => void
  initial?: Supplier | null
}

const EMPTY: CreateSupplierPayload = {
  supplier_code: '',
  name: '',
  supplier_type: 'DISTRIBUTOR',
  payment_term: 'NET30',
  debt_limit: 0,
}

export function SupplierFormDialog({ open, onClose, initial }: Props): React.JSX.Element {
  const isEdit = Boolean(initial)
  const [form, setForm] = useState<CreateSupplierPayload>(EMPTY)
  const createMut = useCreateSupplier()
  const updateMut = useUpdateSupplier()

  useEffect(() => {
    if (initial) {
      setForm({
        supplier_code: initial.supplier_code,
        name: initial.name,
        short_name: initial.short_name ?? '',
        tax_code: initial.tax_code ?? '',
        supplier_type: initial.supplier_type,
        contact_person: initial.contact_person ?? '',
        primary_phone: initial.primary_phone ?? '',
        primary_email: initial.primary_email ?? '',
        billing_address: initial.billing_address ?? '',
        payment_term: initial.payment_term,
        debt_limit: Number(initial.debt_limit),
        notes: initial.notes ?? '',
      })
    } else {
      setForm(EMPTY)
    }
  }, [initial, open])

  const update = <K extends keyof CreateSupplierPayload>(k: K, v: CreateSupplierPayload[K]): void =>
    setForm((prev) => ({ ...prev, [k]: v }))

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!form.supplier_code.trim() || !form.name.trim()) {
      toast.error('Mã NCC và Tên là bắt buộc')
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
          <DialogTitle>{isEdit ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp mới'}</DialogTitle>
          <DialogDescription>Điền thông tin pháp nhân và điều khoản thanh toán.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code">Mã NCC *</Label>
              <Input
                id="code"
                value={form.supplier_code}
                onChange={(e) => update('supplier_code', e.target.value)}
                disabled={isEdit}
                placeholder="VD: SUP-FPT"
                required
              />
            </div>
            <div>
              <Label htmlFor="type">Loại NCC</Label>
              <Select
                value={form.supplier_type}
                onValueChange={(v) => update('supplier_type', v as SupplierType)}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SUPPLIER_TYPE_LABELS).map(([k, v]) => (
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
              <Label htmlFor="name">Tên pháp nhân *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="short">Tên ngắn</Label>
              <Input
                id="short"
                value={form.short_name ?? ''}
                onChange={(e) => update('short_name', e.target.value)}
              />
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
                value={form.contact_person ?? ''}
                onChange={(e) => update('contact_person', e.target.value)}
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
              <Label htmlFor="term">Điều khoản thanh toán</Label>
              <Select
                value={form.payment_term}
                onValueChange={(v) => update('payment_term', v as PaymentTerm)}
              >
                <SelectTrigger id="term">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_TERM_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="debt">Hạn mức công nợ</Label>
              <Input
                id="debt"
                type="number"
                min={0}
                value={form.debt_limit ?? 0}
                onChange={(e) => update('debt_limit', Number(e.target.value))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="addr">Địa chỉ xuất hóa đơn</Label>
            <Textarea
              id="addr"
              rows={2}
              value={form.billing_address ?? ''}
              onChange={(e) => update('billing_address', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="notes">Ghi chú</Label>
            <Textarea
              id="notes"
              rows={2}
              value={form.notes ?? ''}
              onChange={(e) => update('notes', e.target.value)}
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
