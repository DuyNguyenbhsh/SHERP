import { useState } from 'react'
import { Loader2, Plus, Pencil, Trash2, RotateCcw, Ban } from 'lucide-react'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  useCustomers,
  useDeleteCustomer,
  useRestoreCustomer,
  CUSTOMER_TYPE_LABELS,
  CUSTOMER_PAYMENT_TERM_LABELS,
  type Customer,
} from '@/entities/customer'
import { CustomerFormDialog } from '@/features/customer/ui/CustomerFormDialog'
import { getErrorMessage } from '@/shared/api/axios'
import { QueryStateRow } from '@/shared/ui'

export function CustomersPage(): React.JSX.Element {
  const [showInactive, setShowInactive] = useState(false)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Customer | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)

  const {
    data: customers,
    isLoading,
    isError,
    error,
    refetch,
  } = useCustomers({
    is_active: showInactive ? undefined : true,
  })
  const deleteMut = useDeleteCustomer()
  const restoreMut = useRestoreCustomer()

  const filtered = (customers ?? []).filter((c) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      c.customer_code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      (c.tax_code?.toLowerCase().includes(q) ?? false)
    )
  })

  const handleDelete = (): void => {
    if (!deleteTarget) return
    deleteMut.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(`Đã vô hiệu hóa "${deleteTarget.name}"`)
        setDeleteTarget(null)
      },
      onError: (err) => toast.error(getErrorMessage(err, 'Thao tác thất bại')),
    })
  }

  const handleRestore = (c: Customer): void => {
    restoreMut.mutate(c.id, {
      onSuccess: () => toast.success(`Đã khôi phục "${c.name}"`),
      onError: (err) => toast.error(getErrorMessage(err, 'Khôi phục thất bại')),
    })
  }

  const formatNum = (v: number | string): string => new Intl.NumberFormat('vi-VN').format(Number(v))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Khách hàng</h1>
          <p className="text-muted-foreground text-sm">
            Quản lý danh sách khách hàng, hạn mức công nợ và điều khoản thanh toán.
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm khách hàng
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="Tìm theo mã / tên / MST..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="h-4 w-4"
          />
          Hiển thị cả đã vô hiệu
        </label>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã KH</TableHead>
              <TableHead>Tên pháp nhân</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Điện thoại</TableHead>
              <TableHead>Điều khoản</TableHead>
              <TableHead className="text-right">Hạn mức</TableHead>
              <TableHead className="text-right">Công nợ</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-32">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading || isError || filtered.length === 0 ? (
              <QueryStateRow
                colSpan={9}
                isLoading={isLoading}
                isError={isError}
                isEmpty={filtered.length === 0}
                error={error}
                onRetry={() => void refetch()}
                emptyText="Không có khách hàng nào"
              />
            ) : (
              filtered.map((c) => {
                const overLimit = Number(c.current_debt) > Number(c.credit_limit)
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-sm">{c.customer_code}</TableCell>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{CUSTOMER_TYPE_LABELS[c.customer_type]}</Badge>
                    </TableCell>
                    <TableCell>{c.primary_phone ?? '-'}</TableCell>
                    <TableCell>{CUSTOMER_PAYMENT_TERM_LABELS[c.payment_term]}</TableCell>
                    <TableCell className="text-right">{formatNum(c.credit_limit)}</TableCell>
                    <TableCell
                      className={`text-right ${overLimit ? 'text-destructive font-semibold' : ''}`}
                    >
                      {formatNum(c.current_debt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {c.is_active ? (
                          <Badge>Hoạt động</Badge>
                        ) : (
                          <Badge variant="secondary">Đã vô hiệu</Badge>
                        )}
                        {c.is_blacklisted && (
                          <Badge variant="destructive">
                            <Ban className="mr-1 h-3 w-3" />
                            Blacklist
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {c.is_active ? (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => setEditTarget(c)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(c)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button variant="ghost" size="icon" onClick={() => handleRestore(c)}>
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CustomerFormDialog open={formOpen} onClose={() => setFormOpen(false)} />
      <CustomerFormDialog
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        initial={editTarget}
      />

      <Dialog open={deleteTarget !== null} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vô hiệu hóa khách hàng?</DialogTitle>
            <DialogDescription>
              Khách hàng <strong>{deleteTarget?.name}</strong> sẽ được đánh dấu inactive (xóa mềm —
              giữ lịch sử Sales Order).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMut.isPending}>
              {deleteMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
