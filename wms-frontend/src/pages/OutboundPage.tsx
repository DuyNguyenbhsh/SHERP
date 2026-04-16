import { useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
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
import {
  useOutboundOrders,
  useUpdateOutboundStatus,
  OUTBOUND_STATUS_LABELS,
  OUTBOUND_TYPE_LABELS,
  type OutboundOrder,
  type OutboundStatus,
} from '@/entities/outbound'
import { CreateOutboundDialog } from '@/features/outbound/ui/CreateOutboundDialog'
import { getErrorMessage } from '@/shared/api/axios'

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  PENDING: 'outline',
  ALLOCATED: 'outline',
  PICKING: 'secondary',
  PICKED: 'secondary',
  PACKING: 'secondary',
  PACKED: 'secondary',
  SHIPPED: 'default',
  DELIVERED: 'default',
  CANCELED: 'destructive',
}

const FLOW: Record<OutboundStatus, OutboundStatus | null> = {
  PENDING: 'ALLOCATED',
  ALLOCATED: 'PICKING',
  PICKING: 'PICKED',
  PICKED: 'PACKING',
  PACKING: 'PACKED',
  PACKED: 'SHIPPED',
  SHIPPED: null, // sang DELIVERED qua TMS POD
  DELIVERED: null,
  CANCELED: null,
}

export function OutboundPage(): React.JSX.Element {
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [createOpen, setCreateOpen] = useState(false)

  const { data: orders, isLoading } = useOutboundOrders(
    statusFilter === 'ALL' ? undefined : statusFilter,
  )
  const updateStatusMut = useUpdateOutboundStatus()

  const advance = (o: OutboundOrder, next: OutboundStatus): void => {
    updateStatusMut.mutate(
      { id: o.id, status: next },
      {
        onSuccess: () => toast.success(`${o.order_number} → ${OUTBOUND_STATUS_LABELS[next]}`),
        onError: (err) => toast.error(getErrorMessage(err, 'Cập nhật thất bại')),
      },
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Xuất kho</h1>
          <p className="text-muted-foreground text-sm">
            Luồng Order-to-Fulfillment: Pick → Pack → Ship → POD.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Tạo phiếu xuất
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
            {Object.entries(OUTBOUND_STATUS_LABELS).map(([k, v]) => (
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
                <TableHead>Số phiếu</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Khách hàng</TableHead>
                <TableHead className="text-center">Dòng hàng</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="w-40">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(orders ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                    Không có phiếu xuất nào
                  </TableCell>
                </TableRow>
              ) : (
                (orders ?? []).map((o) => {
                  const next = FLOW[o.status]
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-sm">{o.order_number}</TableCell>
                      <TableCell>{OUTBOUND_TYPE_LABELS[o.order_type]}</TableCell>
                      <TableCell>{o.customer_name ?? '-'}</TableCell>
                      <TableCell className="text-center">{o.lines?.length ?? 0}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[o.status]}>
                          {OUTBOUND_STATUS_LABELS[o.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(o.created_at).toLocaleDateString('vi-VN')}
                      </TableCell>
                      <TableCell>
                        {next && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => advance(o, next)}
                            disabled={updateStatusMut.isPending}
                          >
                            → {OUTBOUND_STATUS_LABELS[next]}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateOutboundDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
