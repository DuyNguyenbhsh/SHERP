import { useMemo, useState } from 'react'
import { Loader2, Pencil, ArrowLeftRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
import { useInventory, STOCK_STATUS_LABELS } from '@/entities/inventory'
import { useProducts } from '@/entities/product'
import { AdjustInventoryDialog } from '@/features/inventory/ui/AdjustInventoryDialog'
import { TransferInventoryDialog } from '@/features/inventory/ui/TransferInventoryDialog'

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  AVAILABLE: 'default',
  RESERVED: 'secondary',
  IN_TRANSIT: 'secondary',
  QUARANTINE: 'outline',
  DAMAGED: 'destructive',
}

export function InventoryPage(): React.JSX.Element {
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [search, setSearch] = useState('')
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)

  const { data: items, isLoading } = useInventory({
    status: statusFilter === 'ALL' ? undefined : statusFilter,
  })
  const { data: products } = useProducts()

  const productMap = useMemo(() => new Map((products ?? []).map((p) => [p.id, p])), [products])

  const filtered = (items ?? []).filter((i) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    const product = productMap.get(i.product_id)
    return (
      product?.sku.toLowerCase().includes(q) ||
      product?.name.toLowerCase().includes(q) ||
      i.lot_number?.toLowerCase().includes(q) ||
      i.serial_number?.toLowerCase().includes(q) ||
      false
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tồn kho</h1>
          <p className="text-muted-foreground text-sm">
            Theo dõi tồn kho real-time theo vị trí, lô và trạng thái.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAdjustOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Điều chỉnh
          </Button>
          <Button onClick={() => setTransferOpen(true)}>
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            Chuyển kho
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="Tìm theo SKU / tên / lô / serial..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
            {Object.entries(STOCK_STATUS_LABELS).map(([k, v]) => (
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
                <TableHead>SKU</TableHead>
                <TableHead>Tên sản phẩm</TableHead>
                <TableHead>Vị trí</TableHead>
                <TableHead>Lô / Serial</TableHead>
                <TableHead className="text-right">On hand</TableHead>
                <TableHead className="text-right">Reserved</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground py-8 text-center">
                    Không có bản ghi tồn kho nào
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((i) => {
                  const product = productMap.get(i.product_id)
                  const available = i.qty_on_hand - i.qty_reserved
                  return (
                    <TableRow key={i.id}>
                      <TableCell className="font-mono text-sm">
                        {product?.sku ?? i.product_id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="font-medium">{product?.name ?? '-'}</TableCell>
                      <TableCell>{i.location?.code ?? '-'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {i.lot_number ?? i.serial_number ?? '-'}
                      </TableCell>
                      <TableCell className="text-right">{i.qty_on_hand}</TableCell>
                      <TableCell className="text-right">{i.qty_reserved}</TableCell>
                      <TableCell className="text-right font-medium">{available}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[i.status]}>
                          {STOCK_STATUS_LABELS[i.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <AdjustInventoryDialog open={adjustOpen} onClose={() => setAdjustOpen(false)} />
      <TransferInventoryDialog open={transferOpen} onClose={() => setTransferOpen(false)} />
    </div>
  )
}
