import { useMemo, useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
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
import { usePurchaseOrders, PO_STATUS_LABELS } from '@/entities/procurement'
import { useSuppliers } from '@/entities/supplier'
import { CreatePoDialog } from '@/features/procurement/ui/CreatePoDialog'

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  DRAFT: 'outline',
  APPROVED: 'secondary',
  RECEIVING: 'secondary',
  COMPLETED: 'default',
  CANCELED: 'destructive',
}

export function ProcurementPage(): React.JSX.Element {
  const [createOpen, setCreateOpen] = useState(false)
  const { data: pos, isLoading } = usePurchaseOrders()
  const { data: suppliers } = useSuppliers()

  const supplierMap = useMemo(() => new Map((suppliers ?? []).map((s) => [s.id, s])), [suppliers])

  const formatCurrency = (v: number | string): string =>
    new Intl.NumberFormat('vi-VN').format(Number(v))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mua hàng</h1>
          <p className="text-muted-foreground text-sm">
            Source-to-Pay: Tạo PO → Duyệt → Nhận hàng (GRN) → Thanh toán.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Tạo PO
        </Button>
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
                <TableHead>Số PO</TableHead>
                <TableHead>Nhà cung cấp</TableHead>
                <TableHead className="text-center">Dòng hàng</TableHead>
                <TableHead className="text-right">Tổng tiền</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày tạo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(pos ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                    Chưa có PO nào
                  </TableCell>
                </TableRow>
              ) : (
                (pos ?? []).map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-mono text-sm">{po.po_number}</TableCell>
                    <TableCell className="font-medium">
                      {po.vendor_id ? (supplierMap.get(po.vendor_id)?.name ?? po.vendor_id) : '-'}
                    </TableCell>
                    <TableCell className="text-center">{po.lines?.length ?? 0}</TableCell>
                    <TableCell className="text-right">{formatCurrency(po.total_amount)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[po.status]}>
                        {PO_STATUS_LABELS[po.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(po.created_at).toLocaleDateString('vi-VN')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <CreatePoDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
