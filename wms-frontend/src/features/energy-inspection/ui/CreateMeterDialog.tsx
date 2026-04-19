import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateMeter, MeterType, METER_TYPE_LABELS } from '@/entities/energy-inspection'
import { getErrorMessage } from '@/shared/api/axios'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  defaultProjectId?: string
}

export function CreateMeterDialog({
  open,
  onOpenChange,
  defaultProjectId,
}: Props): React.JSX.Element {
  const createMut = useCreateMeter()
  const [form, setForm] = useState({
    code: '',
    name: '',
    project_id: defaultProjectId ?? '',
    meter_type: MeterType.ELECTRICITY as string,
    unit: 'kWh',
    location_text: '',
    is_cumulative: true,
  })

  useEffect(() => {
    if (open) {
      setForm({
        code: '',
        name: '',
        project_id: defaultProjectId ?? '',
        meter_type: MeterType.ELECTRICITY,
        unit: 'kWh',
        location_text: '',
        is_cumulative: true,
      })
    }
  }, [open, defaultProjectId])

  const handleSubmit = (): void => {
    if (!form.code || !form.name || !form.project_id) {
      toast.error('Nhập đủ mã / tên / project')
      return
    }
    createMut.mutate(
      {
        code: form.code,
        name: form.name,
        project_id: form.project_id,
        meter_type: form.meter_type as typeof MeterType.ELECTRICITY,
        unit: form.unit,
        location_text: form.location_text || undefined,
        is_cumulative: form.is_cumulative,
      },
      {
        onSuccess: () => {
          toast.success('Đã tạo Meter')
          onOpenChange(false)
        },
        onError: (err) => toast.error(getErrorMessage(err, 'Tạo Meter thất bại')),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Đăng ký đồng hồ mới</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-3 items-center gap-3">
            <Label>Mã *</Label>
            <Input
              className="col-span-2"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="EM-TOWER-A-L3-01"
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-3">
            <Label>Tên *</Label>
            <Input
              className="col-span-2"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-3">
            <Label>Project UUID *</Label>
            <Input
              className="col-span-2"
              value={form.project_id}
              onChange={(e) => setForm({ ...form, project_id: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-3">
            <Label>Loại</Label>
            <Select
              value={form.meter_type}
              onValueChange={(v) => {
                const unit = v === 'ELECTRICITY' ? 'kWh' : v === 'WATER' ? 'm³' : 'm³'
                setForm({ ...form, meter_type: v, unit })
              }}
            >
              <SelectTrigger className="col-span-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(METER_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 items-center gap-3">
            <Label>Đơn vị</Label>
            <Input
              className="col-span-2"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-3">
            <Label>Vị trí</Label>
            <Input
              className="col-span-2"
              value={form.location_text}
              onChange={(e) => setForm({ ...form, location_text: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-3">
            <Label>Cumulative</Label>
            <label className="col-span-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_cumulative}
                onChange={(e) => setForm({ ...form, is_cumulative: e.target.checked })}
              />
              Đồng hồ tổng (không cho giảm — BR-EI-01)
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button onClick={handleSubmit} disabled={createMut.isPending}>
            {createMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
