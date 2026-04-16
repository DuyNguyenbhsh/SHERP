import { useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
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
import { useCreatePO, type CreatePoLinePayload, type CreatePoPayload } from '@/entities/procurement'
import { useProducts } from '@/entities/product'
import { useSuppliers } from '@/entities/supplier'
import { getErrorMessage } from '@/shared/api/axios'

interface Props {
  open: boolean
  onClose: () => void
}

const emptyLine = (): CreatePoLinePayload => ({
  product_id: '',
  order_qty: 1,
  unit_price: 0,
})

export function CreatePoDialog({ open, onClose }: Props): React.JSX.Element {
  const { data: products } = useProducts()
  const { data: suppliers } = useSuppliers()
  const createMut = useCreatePO()

  const [vendorId, setVendorId] = useState('')
  const [lines, setLines] = useState<CreatePoLinePayload[]>([emptyLine()])

  const total = lines.reduce((sum, l) => sum + l.order_qty * l.unit_price, 0)

  const updateLine = (idx: number, patch: Partial<CreatePoLinePayload>): void => {
    setLines((p) => p.map((l, i) => (i === idx ? { ...l, ...patch } : l)))
  }

  const reset = (): void => {
    setVendorId('')
    setLines([emptyLine()])
  }

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!vendorId) {
      toast.error('Vui lòng chọn nhà cung cấp')
      return
    }
    for (const l of lines) {
      if (!l.product_id || l.order_qty <= 0 || l.unit_price < 0) {
        toast.error('Kiểm tra lại dòng hàng: sản phẩm, SL > 0, giá ≥ 0')
        return
      }
    }

    const payload: CreatePoPayload = {
      vendor_id: vendorId,
      lines,
    }
    createMut.mutate(payload, {
      onSuccess: (po) => {
        toast.success(`Tạo PO ${po.po_number} thành công`)
        reset()
        onClose()
      },
      onError: (err) => toast.error(getErrorMessage(err, 'Tạo PO thất bại')),
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          reset()
          onClose()
        }
      }}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Tạo Đơn đặt hàng (PO)</DialogTitle>
          <DialogDescription>
            Chọn NCC và dòng hàng. PO được tự duyệt khi tạo (theo flow S2P).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nhà cung cấp *</Label>
            <Select value={vendorId} onValueChange={setVendorId}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn NCC..." />
              </SelectTrigger>
              <SelectContent>
                {(suppliers ?? [])
                  .filter((s) => s.is_active)
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.supplier_code} — {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Dòng hàng</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLines((p) => [...p, emptyLine()])}
              >
                <Plus className="mr-1 h-3 w-3" />
                Thêm dòng
              </Button>
            </div>
            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2">
                  <Select
                    value={line.product_id}
                    onValueChange={(v) => updateLine(idx, { product_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sản phẩm..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(products ?? [])
                        .filter((p) => p.is_active)
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.sku} — {p.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={1}
                    value={line.order_qty}
                    onChange={(e) => updateLine(idx, { order_qty: Number(e.target.value) })}
                    placeholder="Số lượng"
                  />
                  <Input
                    type="number"
                    min={0}
                    value={line.unit_price}
                    onChange={(e) =>
                      updateLine(idx, {
                        unit_price: Number(e.target.value),
                      })
                    }
                    placeholder="Đơn giá"
                  />
                  <div className="bg-muted flex items-center rounded px-2 text-sm">
                    {new Intl.NumberFormat('vi-VN').format(line.order_qty * line.unit_price)}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setLines((p) => p.filter((_, i) => i !== idx))}
                    disabled={lines.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end border-t pt-2 text-lg font-semibold">
            Tổng: {new Intl.NumberFormat('vi-VN').format(total)} VND
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={createMut.isPending}>
              {createMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Tạo PO
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
