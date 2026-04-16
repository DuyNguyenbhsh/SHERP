import { useState } from 'react'
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react'
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
import { useVehicles, useDeleteVehicle, type Vehicle } from '@/entities/vehicle'
import { VehicleFormDialog } from '@/features/vehicle/ui/VehicleFormDialog'
import { getErrorMessage } from '@/shared/api/axios'

export function VehiclesPage(): React.JSX.Element {
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Vehicle | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null)

  const { data: vehicles, isLoading } = useVehicles()
  const deleteMut = useDeleteVehicle()

  const handleDelete = (): void => {
    if (!deleteTarget) return
    deleteMut.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(`Đã xóa xe ${deleteTarget.code}`)
        setDeleteTarget(null)
      },
      onError: (err) => toast.error(getErrorMessage(err, 'Xóa thất bại')),
    })
  }

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'outline' => {
    if (status === 'Sẵn sàng') return 'default'
    if (status === 'Bảo trì') return 'outline'
    return 'secondary'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Đội xe</h1>
          <p className="text-muted-foreground text-sm">Quản lý xe vận chuyển và tài xế nội bộ.</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm xe
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
                <TableHead>Mã xe</TableHead>
                <TableHead>Biển số</TableHead>
                <TableHead>Tài xế</TableHead>
                <TableHead>Hãng</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="w-32">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(vehicles ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                    Chưa có xe nào
                  </TableCell>
                </TableRow>
              ) : (
                (vehicles ?? []).map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-sm">{v.code}</TableCell>
                    <TableCell>{v.licensePlate ?? '-'}</TableCell>
                    <TableCell className="font-medium">{v.driverName}</TableCell>
                    <TableCell>{v.brand ?? '-'}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(v.status)}>{v.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setEditTarget(v)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(v)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <VehicleFormDialog open={formOpen} onClose={() => setFormOpen(false)} />
      <VehicleFormDialog
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        initial={editTarget}
      />

      <Dialog open={deleteTarget !== null} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa xe?</DialogTitle>
            <DialogDescription>
              Xe <strong>{deleteTarget?.code}</strong> sẽ bị xóa khỏi đội. Không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMut.isPending}>
              {deleteMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
