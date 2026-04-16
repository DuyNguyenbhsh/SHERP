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
  useCreateProduct,
  useUpdateProduct,
  ITEM_TYPE_LABELS,
  type Product,
  type CreateProductPayload,
  type ItemType,
} from '@/entities/product'
import { getErrorMessage } from '@/shared/api/axios'

interface Props {
  open: boolean
  onClose: () => void
  initial?: Product | null
}

const EMPTY: CreateProductPayload = {
  sku: '',
  name: '',
  item_type: 'GOODS',
  unit_of_measure: 'Cái',
  purchase_price: 0,
  retail_price: 0,
  wholesale_price: 0,
  warranty_months_vendor: 0,
  warranty_months_customer: 0,
  is_serial_tracking: false,
  notes: '',
}

export function ProductFormDialog({ open, onClose, initial }: Props): React.JSX.Element {
  const isEdit = Boolean(initial)
  const [form, setForm] = useState<CreateProductPayload>(EMPTY)
  const createMut = useCreateProduct()
  const updateMut = useUpdateProduct()

  useEffect(() => {
    if (initial) {
      setForm({
        sku: initial.sku,
        name: initial.name,
        item_type: initial.item_type,
        unit_of_measure: initial.unit_of_measure,
        purchase_price: Number(initial.purchase_price),
        retail_price: Number(initial.retail_price),
        wholesale_price: Number(initial.wholesale_price),
        warranty_months_vendor: initial.warranty_months_vendor,
        warranty_months_customer: initial.warranty_months_customer,
        is_serial_tracking: initial.is_serial_tracking,
        notes: initial.notes ?? '',
      })
    } else {
      setForm(EMPTY)
    }
  }, [initial, open])

  const update = <K extends keyof CreateProductPayload>(k: K, v: CreateProductPayload[K]): void =>
    setForm((prev) => ({ ...prev, [k]: v }))

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!form.sku.trim() || !form.name.trim()) {
      toast.error('Mã và Tên sản phẩm là bắt buộc')
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
          <DialogTitle>{isEdit ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}</DialogTitle>
          <DialogDescription>
            Điền thông tin cơ bản. Các trường nâng cao có thể bổ sung sau.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sku">Mã SKU *</Label>
              <Input
                id="sku"
                value={form.sku}
                onChange={(e) => update('sku', e.target.value)}
                disabled={isEdit}
                placeholder="VD: CPU-I5-13400F"
                required
              />
            </div>
            <div>
              <Label htmlFor="item_type">Loại</Label>
              <Select
                value={form.item_type}
                onValueChange={(v) => update('item_type', v as ItemType)}
              >
                <SelectTrigger id="item_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ITEM_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="name">Tên sản phẩm *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="unit">Đơn vị tính</Label>
              <Input
                id="unit"
                value={form.unit_of_measure ?? ''}
                onChange={(e) => update('unit_of_measure', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="wv">BH NCC (tháng)</Label>
              <Input
                id="wv"
                type="number"
                min={0}
                value={form.warranty_months_vendor ?? 0}
                onChange={(e) => update('warranty_months_vendor', Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="wc">BH KH (tháng)</Label>
              <Input
                id="wc"
                type="number"
                min={0}
                value={form.warranty_months_customer ?? 0}
                onChange={(e) => update('warranty_months_customer', Number(e.target.value))}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="pp">Giá nhập</Label>
              <Input
                id="pp"
                type="number"
                min={0}
                value={form.purchase_price ?? 0}
                onChange={(e) => update('purchase_price', Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="rp">Giá lẻ</Label>
              <Input
                id="rp"
                type="number"
                min={0}
                value={form.retail_price ?? 0}
                onChange={(e) => update('retail_price', Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="wp">Giá sỉ</Label>
              <Input
                id="wp"
                type="number"
                min={0}
                value={form.wholesale_price ?? 0}
                onChange={(e) => update('wholesale_price', Number(e.target.value))}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="serial"
              type="checkbox"
              checked={form.is_serial_tracking ?? false}
              onChange={(e) => update('is_serial_tracking', e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="serial" className="cursor-pointer">
              Bắt buộc quét Serial khi nhập/xuất kho
            </Label>
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
