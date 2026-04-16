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
  useSuppliers,
  useDeleteSupplier,
  useRestoreSupplier,
  SUPPLIER_TYPE_LABELS,
  PAYMENT_TERM_LABELS,
  type Supplier,
} from '@/entities/supplier'
import { SupplierFormDialog } from '@/features/supplier/ui/SupplierFormDialog'
import { getErrorMessage } from '@/shared/api/axios'

export function SuppliersPage(): React.JSX.Element {
  const [showInactive, setShowInactive] = useState(false)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Supplier | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null)

  const { data: suppliers, isLoading } = useSuppliers(showInactive)
  const deleteMut = useDeleteSupplier()
  const restoreMut = useRestoreSupplier()

  const filtered = (suppliers ?? []).filter((s) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      s.supplier_code.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      (s.tax_code?.toLowerCase().includes(q) ?? false)
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

  const handleRestore = (s: Supplier): void => {
    restoreMut.mutate(s.id, {
      onSuccess: () => toast.success(`Đã khôi phục "${s.name}"`),
      onError: (err) => toast.error(getErrorMessage(err, 'Khôi phục thất bại')),
    })
  }

  const formatNum = (v: number | string): string => new Intl.NumberFormat('vi-VN').format(Number(v))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nhà cung cấp</h1>
          <p className="text-muted-foreground text-sm">
            Quản lý đối tác mua hàng, điều khoản thanh toán và hạn mức công nợ.
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm NCC
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

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã NCC</TableHead>
                <TableHead>Tên pháp nhân</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Điện thoại</TableHead>
                <TableHead>Điều khoản</TableHead>
                <TableHead className="text-right">Hạn mức nợ</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="w-32">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground py-8 text-center">
                    Không có nhà cung cấp nào
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-sm">{s.supplier_code}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{SUPPLIER_TYPE_LABELS[s.supplier_type]}</Badge>
                    </TableCell>
                    <TableCell>{s.primary_phone ?? '-'}</TableCell>
                    <TableCell>{PAYMENT_TERM_LABELS[s.payment_term]}</TableCell>
                    <TableCell className="text-right">{formatNum(s.debt_limit)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {s.is_active ? (
                          <Badge>Hoạt động</Badge>
                        ) : (
                          <Badge variant="secondary">Đã vô hiệu</Badge>
                        )}
                        {s.is_blacklisted && (
                          <Badge variant="destructive">
                            <Ban className="mr-1 h-3 w-3" />
                            Blacklist
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {s.is_active ? (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => setEditTarget(s)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(s)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button variant="ghost" size="icon" onClick={() => handleRestore(s)}>
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <SupplierFormDialog open={formOpen} onClose={() => setFormOpen(false)} />
      <SupplierFormDialog
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        initial={editTarget}
      />

      <Dialog open={deleteTarget !== null} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vô hiệu hóa nhà cung cấp?</DialogTitle>
            <DialogDescription>
              NCC <strong>{deleteTarget?.name}</strong> sẽ được đánh dấu inactive (xóa mềm — giữ
              lịch sử PO). Bạn có thể khôi phục sau.
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
