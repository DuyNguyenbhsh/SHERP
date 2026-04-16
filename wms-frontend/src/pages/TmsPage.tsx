import { useState } from 'react'
import { Loader2, Plus, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useWaybills, useCompleteDelivery, WAYBILL_STATUS_LABELS } from '@/entities/tms'
import { CreateWaybillDialog } from '@/features/tms/ui/CreateWaybillDialog'
import { getErrorMessage } from '@/shared/api/axios'

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  DRAFT: 'outline',
  READY_TO_PICK: 'secondary',
  IN_TRANSIT: 'secondary',
  DELIVERED: 'default',
  CANCELED: 'destructive',
}

export function TmsPage(): React.JSX.Element {
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [createOpen, setCreateOpen] = useState(false)

  const { data: waybills, isLoading } = useWaybills(
    statusFilter === 'ALL' ? undefined : statusFilter,
  )
  const completeMut = useCompleteDelivery()

  const handleComplete = (id: string, code: string): void => {
    completeMut.mutate(id, {
      onSuccess: () => toast.success(`${code} đã giao thành công (POD)`),
      onError: (err) => toast.error(getErrorMessage(err, 'Hoàn tất giao hàng thất bại')),
    })
  }

  const formatCurrency = (v: number | string): string =>
    new Intl.NumberFormat('vi-VN').format(Number(v))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vận tải & Giao hàng</h1>
          <p className="text-muted-foreground text-sm">
            Dock-to-Door: Gom đơn → Chuyển xe → Giao hàng → POD.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Tạo vận đơn
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
            {Object.entries(WAYBILL_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã vận đơn</TableHead>
                <TableHead>Xe / Tài xế</TableHead>
                <TableHead className="text-center">Số đơn</TableHead>
                <TableHead className="text-right">COD</TableHead>
                <TableHead className="text-right">Phí VC</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="w-32">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(waybills ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                    Không có vận đơn nào
                  </TableCell>
                </TableRow>
              ) : (
                (waybills ?? []).map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-mono text-sm">{w.waybill_code}</TableCell>
                    <TableCell>
                      {w.vehicle?.code
                        ? `${w.vehicle.code} — ${w.vehicle.driverName}`
                        : (w.driver_name ?? '-')}
                    </TableCell>
                    <TableCell className="text-center">{w.outbound_orders?.length ?? 0}</TableCell>
                    <TableCell className="text-right">{formatCurrency(w.cod_amount)}</TableCell>
                    <TableCell className="text-right">
                      {w.shipping_fee ? formatCurrency(w.shipping_fee) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[w.status]}>
                        {WAYBILL_STATUS_LABELS[w.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(w.status === 'IN_TRANSIT' || w.status === 'READY_TO_PICK') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleComplete(w.id, w.waybill_code)}
                          disabled={completeMut.isPending}
                        >
                          <CheckCircle className="mr-1 h-3 w-3" />
                          POD
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateWaybillDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
