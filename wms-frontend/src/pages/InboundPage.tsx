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
  useInboundReceipts,
  useUpdateInboundStatus,
  INBOUND_STATUS_LABELS,
  INBOUND_TYPE_LABELS,
  type InboundStatus,
  type InboundReceipt,
} from '@/entities/inbound'
import { CreateInboundDialog } from '@/features/inbound/ui/CreateInboundDialog'
import { getErrorMessage } from '@/shared/api/axios'

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  PENDING: 'outline',
  INSPECTING: 'secondary',
  PUTAWAY: 'secondary',
  COMPLETED: 'default',
  REJECTED: 'destructive',
}

export function InboundPage(): React.JSX.Element {
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [createOpen, setCreateOpen] = useState(false)

  const { data: receipts, isLoading } = useInboundReceipts(
    statusFilter === 'ALL' ? undefined : statusFilter,
  )
  const updateStatusMut = useUpdateInboundStatus()

  const advanceStatus = (r: InboundReceipt, next: InboundStatus): void => {
    updateStatusMut.mutate(
      { id: r.id, status: next },
      {
        onSuccess: () =>
          toast.success(`Phiếu ${r.receipt_number} → ${INBOUND_STATUS_LABELS[next]}`),
        onError: (err) => toast.error(getErrorMessage(err, 'Cập nhật trạng thái thất bại')),
      },
    )
  }

  const nextStatus = (s: InboundStatus): InboundStatus | null => {
    if (s === 'PENDING') return 'INSPECTING'
    if (s === 'INSPECTING') return 'PUTAWAY'
    if (s === 'PUTAWAY') return 'COMPLETED'
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nhập kho</h1>
          <p className="text-muted-foreground text-sm">
            Luồng Dock-to-Stock: Nhận hàng → Kiểm tra chất lượng → Lên kệ.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Tạo phiếu nhập
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-60">
            <SelectValue placeholder="Lọc theo trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
            {Object.entries(INBOUND_STATUS_LABELS).map(([k, v]) => (
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
                <TableHead>Kho</TableHead>
                <TableHead className="text-center">Dòng hàng</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="w-40">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(receipts ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                    Không có phiếu nhập nào
                  </TableCell>
                </TableRow>
              ) : (
                (receipts ?? []).map((r) => {
                  const next = nextStatus(r.status)
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-sm">{r.receipt_number}</TableCell>
                      <TableCell>{INBOUND_TYPE_LABELS[r.receipt_type]}</TableCell>
                      <TableCell>{r.warehouse_code ?? '-'}</TableCell>
                      <TableCell className="text-center">{r.lines?.length ?? 0}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[r.status]}>
                          {INBOUND_STATUS_LABELS[r.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(r.created_at).toLocaleDateString('vi-VN')}
                      </TableCell>
                      <TableCell>
                        {next && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => advanceStatus(r, next)}
                            disabled={updateStatusMut.isPending}
                          >
                            → {INBOUND_STATUS_LABELS[next]}
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

      <CreateInboundDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
