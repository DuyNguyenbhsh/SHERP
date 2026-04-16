import { useState } from 'react'
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
import { useAdjustInventory, useLocations } from '@/entities/inventory'
import { useProducts } from '@/entities/product'
import { getErrorMessage } from '@/shared/api/axios'

interface Props {
  open: boolean
  onClose: () => void
}

export function AdjustInventoryDialog({ open, onClose }: Props): React.JSX.Element {
  const { data: products } = useProducts()
  const { data: locations } = useLocations()
  const adjustMut = useAdjustInventory()

  const [productId, setProductId] = useState('')
  const [locationId, setLocationId] = useState('')
  const [qty, setQty] = useState(0)
  const [reason, setReason] = useState('')
  const [lot, setLot] = useState('')

  const reset = (): void => {
    setProductId('')
    setLocationId('')
    setQty(0)
    setReason('')
    setLot('')
  }

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!productId || !locationId) {
      toast.error('Vui lòng chọn sản phẩm và vị trí')
      return
    }
    if (qty === 0) {
      toast.error('Số lượng điều chỉnh phải khác 0')
      return
    }
    if (!reason.trim()) {
      toast.error('Bắt buộc nhập lý do điều chỉnh')
      return
    }

    adjustMut.mutate(
      {
        product_id: productId,
        location_id: locationId,
        adjustment_qty: qty,
        reason,
        lot_number: lot || undefined,
      },
      {
        onSuccess: () => {
          toast.success(`Điều chỉnh ${qty > 0 ? '+' : ''}${qty} thành công`)
          reset()
          onClose()
        },
        onError: (err) => toast.error(getErrorMessage(err, 'Điều chỉnh thất bại')),
      },
    )
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Điều chỉnh tồn kho</DialogTitle>
          <DialogDescription>
            Nhập lý do rõ ràng (kiểm kê, hao hụt, đổ vỡ...). Mọi điều chỉnh được ghi log.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Sản phẩm *</Label>
            <Select value={productId} onValueChange={setProductId}>
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
          </div>
          <div>
            <Label>Vị trí *</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn vị trí..." />
              </SelectTrigger>
              <SelectContent>
                {(locations ?? []).map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.code} — {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="qty">Điều chỉnh (+ tăng / - giảm) *</Label>
              <Input
                id="qty"
                type="number"
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                placeholder="VD: +10 hoặc -5"
                required
              />
            </div>
            <div>
              <Label htmlFor="lot">Số lô (tùy chọn)</Label>
              <Input id="lot" value={lot} onChange={(e) => setLot(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="reason">Lý do *</Label>
            <Textarea
              id="reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={adjustMut.isPending}>
              {adjustMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Điều chỉnh
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
