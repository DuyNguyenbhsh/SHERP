import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
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
import {
  useCreateVehicle,
  useUpdateVehicle,
  type Vehicle,
  type CreateVehiclePayload,
} from '@/entities/vehicle'
import { getErrorMessage } from '@/shared/api/axios'

interface Props {
  open: boolean
  onClose: () => void
  initial?: Vehicle | null
}

const EMPTY: CreateVehiclePayload = {
  code: '',
  driverName: '',
  licensePlate: '',
  brand: '',
  status: 'Sẵn sàng',
  description: '',
}

const VEHICLE_STATUSES = ['Sẵn sàng', 'Đang giao', 'Bảo trì', 'Ngưng hoạt động']

export function VehicleFormDialog({ open, onClose, initial }: Props): React.JSX.Element {
  const isEdit = Boolean(initial)
  const [form, setForm] = useState<CreateVehiclePayload>(EMPTY)
  const createMut = useCreateVehicle()
  const updateMut = useUpdateVehicle()

  useEffect(() => {
    if (initial) {
      setForm({
        code: initial.code,
        licensePlate: initial.licensePlate ?? '',
        driverName: initial.driverName,
        brand: initial.brand ?? '',
        status: initial.status,
        description: initial.description ?? '',
      })
    } else {
      setForm(EMPTY)
    }
  }, [initial, open])

  const update = <K extends keyof CreateVehiclePayload>(k: K, v: CreateVehiclePayload[K]): void =>
    setForm((p) => ({ ...p, [k]: v }))

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!form.code.trim() || !form.driverName.trim()) {
      toast.error('Mã xe và Tên tài xế là bắt buộc')
      return
    }

    if (isEdit && initial) {
      updateMut.mutate(
        { id: initial.id, data: form },
        {
          onSuccess: () => {
            toast.success(`Cập nhật xe ${form.code}`)
            onClose()
          },
          onError: (err) => toast.error(getErrorMessage(err, 'Cập nhật thất bại')),
        },
      )
    } else {
      createMut.mutate(form, {
        onSuccess: () => {
          toast.success(`Thêm xe ${form.code} thành công`)
          onClose()
        },
        onError: (err) => toast.error(getErrorMessage(err, 'Tạo mới thất bại')),
      })
    }
  }

  const loading = createMut.isPending || updateMut.isPending

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Sửa xe' : 'Thêm xe mới'}</DialogTitle>
          <DialogDescription>Thông tin xe và tài xế.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code">Mã xe *</Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) => update('code', e.target.value)}
                disabled={isEdit}
                placeholder="VD: 51C66611"
                required
              />
            </div>
            <div>
              <Label htmlFor="plate">Biển số</Label>
              <Input
                id="plate"
                value={form.licensePlate ?? ''}
                onChange={(e) => update('licensePlate', e.target.value)}
                placeholder="51C-666.11"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="driver">Tên tài xế *</Label>
              <Input
                id="driver"
                value={form.driverName}
                onChange={(e) => update('driverName', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="brand">Hãng xe</Label>
              <Input
                id="brand"
                value={form.brand ?? ''}
                onChange={(e) => update('brand', e.target.value)}
                placeholder="Isuzu, Suzuki..."
              />
            </div>
          </div>
          <div>
            <Label>Trạng thái</Label>
            <Select value={form.status ?? 'Sẵn sàng'} onValueChange={(v) => update('status', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VEHICLE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="desc">Mô tả</Label>
            <Textarea
              id="desc"
              rows={2}
              value={form.description ?? ''}
              onChange={(e) => update('description', e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
