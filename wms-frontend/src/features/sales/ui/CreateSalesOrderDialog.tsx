import { useMemo, useState } from 'react'
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
import { useCreateSalesOrder, type CreateSalesOrderPayload } from '@/entities/sales'
import { useCustomers } from '@/entities/customer'
import { useProducts } from '@/entities/product'
import { getErrorMessage } from '@/shared/api/axios'

interface Props {
  open: boolean
  onClose: () => void
}

interface LineForm {
  product_id: string
  qty: number
  unit_price: number
  discount_percent: number
  tax_percent: number
}

const emptyLine = (): LineForm => ({
  product_id: '',
  qty: 1,
  unit_price: 0,
  discount_percent: 0,
  tax_percent: 10,
})

function computeLine(l: LineForm): { subtotal: number; total: number } {
  const subtotal = l.qty * l.unit_price
  const discount = (subtotal * l.discount_percent) / 100
  const tax = ((subtotal - discount) * l.tax_percent) / 100
  return {
    subtotal: Math.round(subtotal),
    total: Math.round(subtotal - discount + tax),
  }
}

export function CreateSalesOrderDialog({ open, onClose }: Props): React.JSX.Element {
  const { data: customers } = useCustomers({ is_active: true })
  const { data: products } = useProducts()
  const createMut = useCreateSalesOrder()

  const [customerId, setCustomerId] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [shipTo, setShipTo] = useState('')
  const [bypassReason, setBypassReason] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<LineForm[]>([emptyLine()])

  const selectedCustomer = useMemo(
    () => (customers ?? []).find((c) => c.id === customerId),
    [customers, customerId],
  )

  const grandTotal = useMemo(() => lines.reduce((sum, l) => sum + computeLine(l).total, 0), [lines])
  const overLimit = useMemo(() => {
    if (!selectedCustomer) return false
    return (
      Number(selectedCustomer.current_debt) + grandTotal > Number(selectedCustomer.credit_limit)
    )
  }, [selectedCustomer, grandTotal])

  const reset = (): void => {
    setCustomerId('')
    setDeliveryDate('')
    setShipTo('')
    setBypassReason('')
    setNotes('')
    setLines([emptyLine()])
  }

  const updateLine = (idx: number, patch: Partial<LineForm>): void =>
    setLines((p) => p.map((l, i) => (i === idx ? { ...l, ...patch } : l)))

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!customerId) {
      toast.error('Chọn khách hàng')
      return
    }
    for (const l of lines) {
      if (!l.product_id || l.qty <= 0 || l.unit_price < 0) {
        toast.error('Kiểm tra lại dòng hàng')
        return
      }
    }

    const payload: CreateSalesOrderPayload = {
      customer_id: customerId,
      required_delivery_date: deliveryDate || undefined,
      ship_to_address: shipTo || undefined,
      bypass_reason: bypassReason || undefined,
      notes: notes || undefined,
      lines,
    }

    createMut.mutate(payload, {
      onSuccess: (so) => {
        toast.success(
          `Tạo ${so.order_number} thành công (Outbound: ${so.outbound_order_number ?? '-'})`,
        )
        reset()
        onClose()
      },
      onError: (err) => toast.error(getErrorMessage(err, 'Tạo SO thất bại')),
    })
  }

  const formatNum = (v: number): string => new Intl.NumberFormat('vi-VN').format(v)

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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo Sales Order</DialogTitle>
          <DialogDescription>
            Hệ thống tự tạo Outbound Order + kiểm tra hạn mức công nợ.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Khách hàng *</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn KH..." />
                </SelectTrigger>
                <SelectContent>
                  {(customers ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.customer_code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCustomer && (
                <p className="text-muted-foreground mt-1 text-xs">
                  Hạn mức: {formatNum(Number(selectedCustomer.credit_limit))} · Công nợ:{' '}
                  {formatNum(Number(selectedCustomer.current_debt))}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="dd">Ngày giao</Label>
              <Input
                id="dd"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="ship">Địa chỉ giao (override)</Label>
            <Textarea
              id="ship"
              rows={2}
              value={shipTo}
              onChange={(e) => setShipTo(e.target.value)}
              placeholder="Để trống nếu giao theo địa chỉ mặc định của KH"
            />
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
              {lines.map((line, idx) => {
                const { total } = computeLine(line)
                return (
                  <div
                    key={idx}
                    className="grid grid-cols-[2fr_1fr_1.3fr_0.8fr_0.8fr_1.2fr_auto] items-end gap-2"
                  >
                    <div>
                      {idx === 0 && <Label className="text-xs">Sản phẩm</Label>}
                      <Select
                        value={line.product_id}
                        onValueChange={(v) => updateLine(idx, { product_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="..." />
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
                      {idx === 0 && <Label className="text-xs">SL</Label>}
                      <Input
                        type="number"
                        min={1}
                        value={line.qty}
                        onChange={(e) => updateLine(idx, { qty: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      {idx === 0 && <Label className="text-xs">Đơn giá</Label>}
                      <Input
                        type="number"
                        min={0}
                        value={line.unit_price}
                        onChange={(e) =>
                          updateLine(idx, {
                            unit_price: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      {idx === 0 && <Label className="text-xs">CK %</Label>}
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={line.discount_percent}
                        onChange={(e) =>
                          updateLine(idx, {
                            discount_percent: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      {idx === 0 && <Label className="text-xs">VAT %</Label>}
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={line.tax_percent}
                        onChange={(e) =>
                          updateLine(idx, {
                            tax_percent: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      {idx === 0 && <Label className="text-xs">Thành tiền</Label>}
                      <div className="bg-muted rounded px-2 py-2 text-right text-sm font-medium">
                        {formatNum(total)}
                      </div>
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
                )
              })}
            </div>
          </div>

          <div className="border-t pt-2 text-right">
            <div className="text-muted-foreground text-sm">Tổng thanh toán</div>
            <div className="text-2xl font-bold">{formatNum(grandTotal)} VND</div>
            {overLimit && (
              <div className="text-destructive mt-1 text-sm">
                ⚠ Vượt hạn mức công nợ. Cần nhập lý do bypass (yêu cầu privilege
                BYPASS_CREDIT_LIMIT).
              </div>
            )}
          </div>

          {overLimit && (
            <div>
              <Label htmlFor="bypass">Lý do bypass credit limit</Label>
              <Textarea
                id="bypass"
                rows={2}
                value={bypassReason}
                onChange={(e) => setBypassReason(e.target.value)}
                placeholder="VD: Khách VIP, lịch sử thanh toán tốt"
              />
            </div>
          )}

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
              Tạo Sales Order
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
