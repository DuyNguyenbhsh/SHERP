import { useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
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
  useCreateOutbound,
  OUTBOUND_TYPE_LABELS,
  type CreateOutboundOrderPayload,
  type CreateOutboundLinePayload,
  type OutboundType,
} from '@/entities/outbound'
import { useProducts } from '@/entities/product'
import { getErrorMessage } from '@/shared/api/axios'

interface Props {
  open: boolean
  onClose: () => void
}

const emptyLine = (): CreateOutboundLinePayload => ({
  product_id: '',
  requested_qty: 1,
})

export function CreateOutboundDialog({ open, onClose }: Props): React.JSX.Element {
  const { data: products } = useProducts()
  const createMut = useCreateOutbound()

  const [form, setForm] = useState<CreateOutboundOrderPayload>({
    order_type: 'SALES_ORDER',
    customer_name: '',
    customer_phone: '',
    delivery_address: '',
    lines: [emptyLine()],
  })

  const update = <K extends keyof CreateOutboundOrderPayload>(
    k: K,
    v: CreateOutboundOrderPayload[K],
  ): void => setForm((p) => ({ ...p, [k]: v }))

  const updateLine = (idx: number, patch: Partial<CreateOutboundLinePayload>): void =>
    setForm((p) => ({
      ...p,
      lines: p.lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)),
    }))

  const addLine = (): void => setForm((p) => ({ ...p, lines: [...p.lines, emptyLine()] }))

  const removeLine = (idx: number): void =>
    setForm((p) => ({ ...p, lines: p.lines.filter((_, i) => i !== idx) }))

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (form.lines.length === 0) {
      toast.error('Phiếu phải có ít nhất 1 dòng hàng')
      return
    }
    for (const l of form.lines) {
      if (!l.product_id || l.requested_qty <= 0) {
        toast.error('Vui lòng chọn sản phẩm và số lượng > 0 cho mọi dòng')
        return
      }
    }
    createMut.mutate(form, {
      onSuccess: (o) => {
        toast.success(`Tạo phiếu ${o.order_number} thành công`)
        setForm({
          order_type: 'SALES_ORDER',
          customer_name: '',
          customer_phone: '',
          delivery_address: '',
          lines: [emptyLine()],
        })
        onClose()
      },
      onError: (err) => toast.error(getErrorMessage(err, 'Tạo phiếu thất bại')),
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Tạo phiếu xuất kho</DialogTitle>
          <DialogDescription>
            Luồng Order-to-Fulfillment: từ lệnh xuất đến TMS giao hàng.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Loại</Label>
              <Select
                value={form.order_type}
                onValueChange={(v) => update('order_type', v as OutboundType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(OUTBOUND_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="customer">Khách hàng</Label>
              <Input
                id="customer"
                value={form.customer_name ?? ''}
                onChange={(e) => update('customer_name', e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Điện thoại</Label>
              <Input
                id="phone"
                value={form.customer_phone ?? ''}
                onChange={(e) => update('customer_phone', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="wh">Mã kho</Label>
              <Input
                id="wh"
                value={form.warehouse_code ?? ''}
                onChange={(e) => update('warehouse_code', e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="addr">Địa chỉ giao</Label>
            <Textarea
              id="addr"
              rows={2}
              value={form.delivery_address ?? ''}
              onChange={(e) => update('delivery_address', e.target.value)}
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Dòng hàng</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="mr-1 h-3 w-3" />
                Thêm dòng
              </Button>
            </div>
            <div className="space-y-2">
              {form.lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2">
                  <Select
                    value={line.product_id}
                    onValueChange={(v) => updateLine(idx, { product_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn sản phẩm..." />
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
                    value={line.requested_qty}
                    onChange={(e) =>
                      updateLine(idx, {
                        requested_qty: Number(e.target.value),
                      })
                    }
                    placeholder="Số lượng"
                  />
                  <Input
                    value={line.lot_number ?? ''}
                    onChange={(e) => updateLine(idx, { lot_number: e.target.value })}
                    placeholder="Lot"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLine(idx)}
                    disabled={form.lines.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={createMut.isPending}>
              {createMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Tạo phiếu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
