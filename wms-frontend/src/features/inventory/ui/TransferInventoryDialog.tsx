import { useState } from 'react'
import { Loader2, ArrowRight } from 'lucide-react'
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
import { useTransferInventory, useLocations } from '@/entities/inventory'
import { useProducts } from '@/entities/product'
import { getErrorMessage } from '@/shared/api/axios'

interface Props {
  open: boolean
  onClose: () => void
}

export function TransferInventoryDialog({ open, onClose }: Props): React.JSX.Element {
  const { data: products } = useProducts()
  const { data: locations } = useLocations()
  const transferMut = useTransferInventory()

  const [productId, setProductId] = useState('')
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [qty, setQty] = useState(1)
  const [lot, setLot] = useState('')
  const [notes, setNotes] = useState('')

  const reset = (): void => {
    setProductId('')
    setFromId('')
    setToId('')
    setQty(1)
    setLot('')
    setNotes('')
  }

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!productId || !fromId || !toId) {
      toast.error('Vui lòng chọn sản phẩm và 2 vị trí')
      return
    }
    if (fromId === toId) {
      toast.error('Vị trí nguồn và đích không được trùng nhau')
      return
    }
    if (qty <= 0) {
      toast.error('Số lượng chuyển phải > 0')
      return
    }

    transferMut.mutate(
      {
        product_id: productId,
        from_location_id: fromId,
        to_location_id: toId,
        qty,
        lot_number: lot || undefined,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          toast.success(`Chuyển ${qty} đơn vị thành công`)
          reset()
          onClose()
        },
        onError: (err) => toast.error(getErrorMessage(err, 'Chuyển kho thất bại')),
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
          <DialogTitle>Chuyển kho nội bộ</DialogTitle>
          <DialogDescription>
            Di chuyển tồn kho giữa 2 vị trí. Thao tác được wrap trong DB transaction để đảm bảo
            ACID.
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
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <div>
              <Label>Từ vị trí *</Label>
              <Select value={fromId} onValueChange={setFromId}>
                <SelectTrigger>
                  <SelectValue placeholder="Nguồn..." />
                </SelectTrigger>
                <SelectContent>
                  {(locations ?? []).map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ArrowRight className="text-muted-foreground mb-2 h-5 w-5" />
            <div>
              <Label>Đến vị trí *</Label>
              <Select value={toId} onValueChange={setToId}>
                <SelectTrigger>
                  <SelectValue placeholder="Đích..." />
                </SelectTrigger>
                <SelectContent>
                  {(locations ?? []).map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="qty">Số lượng *</Label>
              <Input
                id="qty"
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                required
              />
            </div>
            <div>
              <Label htmlFor="lot">Số lô (tùy chọn)</Label>
              <Input id="lot" value={lot} onChange={(e) => setLot(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="notes">Ghi chú</Label>
            <Textarea
              id="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={transferMut.isPending}>
              {transferMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Chuyển kho
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
