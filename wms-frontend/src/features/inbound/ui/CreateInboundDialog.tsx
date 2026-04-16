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
  useCreateInbound,
  INBOUND_TYPE_LABELS,
  type CreateInboundReceiptPayload,
  type CreateInboundLinePayload,
  type InboundType,
} from '@/entities/inbound'
import { useProducts } from '@/entities/product'
import { getErrorMessage } from '@/shared/api/axios'

interface Props {
  open: boolean
  onClose: () => void
}

const emptyLine = (): CreateInboundLinePayload => ({
  product_id: '',
  expected_qty: 1,
  lot_number: '',
})

export function CreateInboundDialog({ open, onClose }: Props): React.JSX.Element {
  const { data: products } = useProducts()
  const createMut = useCreateInbound()

  const [form, setForm] = useState<CreateInboundReceiptPayload>({
    receipt_type: 'PO_RECEIPT',
    warehouse_code: '',
    dock_number: '',
    notes: '',
    lines: [emptyLine()],
  })

  const update = <K extends keyof CreateInboundReceiptPayload>(
    k: K,
    v: CreateInboundReceiptPayload[K],
  ): void => setForm((p) => ({ ...p, [k]: v }))

  const updateLine = (idx: number, patch: Partial<CreateInboundLinePayload>): void => {
    setForm((p) => ({
      ...p,
      lines: p.lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)),
    }))
  }

  const addLine = (): void => setForm((p) => ({ ...p, lines: [...p.lines, emptyLine()] }))

  const removeLine = (idx: number): void =>
    setForm((p) => ({
      ...p,
      lines: p.lines.filter((_, i) => i !== idx),
    }))

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (form.lines.length === 0) {
      toast.error('Phiếu phải có ít nhất 1 dòng hàng')
      return
    }
    for (const l of form.lines) {
      if (!l.product_id) {
        toast.error('Vui lòng chọn sản phẩm cho mọi dòng')
        return
      }
      if (l.expected_qty <= 0) {
        toast.error('Số lượng phải > 0')
        return
      }
    }
    createMut.mutate(form, {
      onSuccess: (receipt) => {
        toast.success(`Tạo phiếu ${receipt.receipt_number} thành công`)
        setForm({
          receipt_type: 'PO_RECEIPT',
          warehouse_code: '',
          dock_number: '',
          notes: '',
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
          <DialogTitle>Tạo phiếu nhập kho</DialogTitle>
          <DialogDescription>
            Điền thông tin phiếu và các dòng hàng dự kiến nhận tại Dock.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Loại phiếu</Label>
              <Select
                value={form.receipt_type}
                onValueChange={(v) => update('receipt_type', v as InboundType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(INBOUND_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="wh">Mã kho</Label>
              <Input
                id="wh"
                value={form.warehouse_code ?? ''}
                onChange={(e) => update('warehouse_code', e.target.value)}
                placeholder="VD: WH-HCM-01"
              />
            </div>
            <div>
              <Label htmlFor="dock">Dock</Label>
              <Input
                id="dock"
                value={form.dock_number ?? ''}
                onChange={(e) => update('dock_number', e.target.value)}
                placeholder="VD: DOCK-A3"
              />
            </div>
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
                    value={line.expected_qty}
                    onChange={(e) =>
                      updateLine(idx, {
                        expected_qty: Number(e.target.value),
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
