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
import { useCreateWaybill, usePendingOutbound, type CreateWaybillPayload } from '@/entities/tms'
import { useVehicles } from '@/entities/vehicle'
import { getErrorMessage } from '@/shared/api/axios'

interface Props {
  open: boolean
  onClose: () => void
}

export function CreateWaybillDialog({ open, onClose }: Props): React.JSX.Element {
  const { data: pending } = usePendingOutbound()
  const { data: vehicles } = useVehicles()
  const createMut = useCreateWaybill()

  const [vehicleId, setVehicleId] = useState('')
  const [driverName, setDriverName] = useState('')
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [codAmount, setCodAmount] = useState(0)
  const [shippingFee, setShippingFee] = useState(0)
  const [notes, setNotes] = useState('')

  const reset = (): void => {
    setVehicleId('')
    setDriverName('')
    setSelectedOrders(new Set())
    setCodAmount(0)
    setShippingFee(0)
    setNotes('')
  }

  const toggleOrder = (id: string): void => {
    setSelectedOrders((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (selectedOrders.size === 0) {
      toast.error('Chọn ít nhất 1 phiếu xuất để gắn vào vận đơn')
      return
    }
    if (!vehicleId && !driverName.trim()) {
      toast.error('Chọn xe hoặc nhập tên tài xế')
      return
    }

    const payload: CreateWaybillPayload = {
      vehicle_id: vehicleId || undefined,
      driver_name: driverName || undefined,
      outbound_order_ids: Array.from(selectedOrders),
      cod_amount: codAmount,
      shipping_fee: shippingFee,
      notes: notes || undefined,
    }

    createMut.mutate(payload, {
      onSuccess: (w) => {
        toast.success(`Tạo vận đơn ${w.waybill_code} thành công`)
        reset()
        onClose()
      },
      onError: (err) => toast.error(getErrorMessage(err, 'Tạo vận đơn thất bại')),
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tạo vận đơn (Waybill)</DialogTitle>
          <DialogDescription>
            Gom các phiếu xuất đã đóng gói vào 1 vận đơn để giao hàng.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Chọn xe (tùy chọn)</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn xe nội bộ..." />
                </SelectTrigger>
                <SelectContent>
                  {(vehicles ?? []).map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.code} — {v.driverName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="driver">Hoặc tài xế ngoài</Label>
              <Input
                id="driver"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="Tên tài xế / đơn vị GHN..."
              />
            </div>
          </div>

          <div>
            <Label>Phiếu xuất cần giao ({selectedOrders.size} đã chọn)</Label>
            <div className="max-h-48 overflow-y-auto rounded-md border p-2">
              {(pending ?? []).length === 0 ? (
                <p className="text-muted-foreground py-4 text-center text-sm">
                  Không có phiếu xuất nào sẵn sàng giao
                </p>
              ) : (
                (pending ?? []).map((o) => (
                  <label
                    key={o.id}
                    className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded px-2 py-1"
                  >
                    <input
                      type="checkbox"
                      checked={selectedOrders.has(o.id)}
                      onChange={() => toggleOrder(o.id)}
                      className="h-4 w-4"
                    />
                    <span className="font-mono text-sm">{o.order_number}</span>
                    <span className="text-muted-foreground text-sm">
                      — {o.customer_name ?? '-'}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cod">Tiền COD</Label>
              <Input
                id="cod"
                type="number"
                min={0}
                value={codAmount}
                onChange={(e) => setCodAmount(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="fee">Phí vận chuyển</Label>
              <Input
                id="fee"
                type="number"
                min={0}
                value={shippingFee}
                onChange={(e) => setShippingFee(Number(e.target.value))}
              />
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
            <Button type="submit" disabled={createMut.isPending}>
              {createMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Tạo vận đơn
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
