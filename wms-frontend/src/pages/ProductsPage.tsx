import { useState } from 'react'
import { Loader2, Plus, Pencil, Trash2, RotateCcw } from 'lucide-react'
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
  useProducts,
  useDeleteProduct,
  useRestoreProduct,
  ITEM_TYPE_LABELS,
  type Product,
} from '@/entities/product'
import { ProductFormDialog } from '@/features/product/ui/ProductFormDialog'
import { QueryStateRow } from '@/shared/ui'
import { getErrorMessage } from '@/shared/api/axios'

export function ProductsPage(): React.JSX.Element {
  const [showInactive, setShowInactive] = useState(false)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Product | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)

  const { data: products, isLoading, isError, error, refetch } = useProducts(showInactive)
  const deleteMut = useDeleteProduct()
  const restoreMut = useRestoreProduct()

  const filtered = (products ?? []).filter((p) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
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

  const handleRestore = (p: Product): void => {
    restoreMut.mutate(p.id, {
      onSuccess: () => toast.success(`Đã khôi phục "${p.name}"`),
      onError: (err) => toast.error(getErrorMessage(err, 'Khôi phục thất bại')),
    })
  }

  const formatPrice = (v: number | string): string =>
    new Intl.NumberFormat('vi-VN').format(Number(v))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sản phẩm</h1>
          <p className="text-muted-foreground text-sm">
            Quản lý danh mục hàng hóa, dịch vụ và tài sản.
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm sản phẩm
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="Tìm theo mã / tên..."
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
              <TableHead>Mã SKU</TableHead>
              <TableHead>Tên</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>ĐVT</TableHead>
              <TableHead className="text-right">Giá nhập</TableHead>
              <TableHead className="text-right">Giá lẻ</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-32">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading || isError || filtered.length === 0 ? (
              <QueryStateRow
                colSpan={8}
                isLoading={isLoading}
                isError={isError}
                isEmpty={filtered.length === 0}
                error={error}
                onRetry={() => void refetch()}
                emptyText="Không có sản phẩm nào"
              />
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-sm">{p.sku}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{ITEM_TYPE_LABELS[p.item_type]}</Badge>
                  </TableCell>
                  <TableCell>{p.unit_of_measure}</TableCell>
                  <TableCell className="text-right">{formatPrice(p.purchase_price)}</TableCell>
                  <TableCell className="text-right">{formatPrice(p.retail_price)}</TableCell>
                  <TableCell>
                    {p.is_active ? (
                      <Badge>Hoạt động</Badge>
                    ) : (
                      <Badge variant="secondary">Đã vô hiệu</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {p.is_active ? (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => setEditTarget(p)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(p)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button variant="ghost" size="icon" onClick={() => handleRestore(p)}>
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

      <ProductFormDialog open={formOpen} onClose={() => setFormOpen(false)} />
      <ProductFormDialog
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        initial={editTarget}
      />

      <Dialog open={deleteTarget !== null} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vô hiệu hóa sản phẩm?</DialogTitle>
            <DialogDescription>
              Sản phẩm <strong>{deleteTarget?.name}</strong> sẽ được đánh dấu inactive (xóa mềm).
              Bạn có thể khôi phục sau.
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
