import { useState } from 'react'
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
import { useCreateTaskTemplate } from '@/entities/master-plan'
import { WORK_ITEM_TYPE_LABELS } from '@/entities/work-item'
import type { WorkItemType } from '@/entities/work-item'
import { getErrorMessage } from '@/shared/api/axios'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  wbsNodeId: string
}

const RRULE_PRESETS: Record<string, string> = {
  'Hàng ngày 7h': 'FREQ=DAILY;BYHOUR=7',
  'Thứ 2 hàng tuần 7h': 'FREQ=WEEKLY;BYDAY=MO;BYHOUR=7',
  'Ngày 1 hàng tháng 7h': 'FREQ=MONTHLY;BYMONTHDAY=1;BYHOUR=7',
}

export function TaskTemplateFormDialog({
  open,
  onOpenChange,
  wbsNodeId,
}: Props): React.JSX.Element {
  const createMut = useCreateTaskTemplate(wbsNodeId)
  const [form, setForm] = useState({
    name: '',
    work_item_type: 'CHECKLIST' as WorkItemType,
    recurrence_rule: 'FREQ=WEEKLY;BYDAY=MO;BYHOUR=7',
    sla_hours: 24,
    default_assignee_role: 'TECHNICIAN',
  })

  const handleSubmit = (): void => {
    if (!form.name || !form.recurrence_rule) {
      toast.error('Nhập đủ tên và recurrence')
      return
    }
    createMut.mutate(form, {
      onSuccess: () => {
        toast.success('Đã tạo Task Template')
        onOpenChange(false)
      },
      onError: (err) => toast.error(getErrorMessage(err, 'Tạo Task Template thất bại')),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Tạo Task Template (recurrence)</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-3 items-center gap-3">
            <Label>Tên *</Label>
            <Input
              className="col-span-2"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-3">
            <Label>Loại Work Item</Label>
            <Select
              value={form.work_item_type}
              onValueChange={(v) => setForm({ ...form, work_item_type: v as WorkItemType })}
            >
              <SelectTrigger className="col-span-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(WORK_ITEM_TYPE_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 items-center gap-3">
            <Label>Lịch sinh</Label>
            <Select
              value={
                Object.entries(RRULE_PRESETS).find(([, v]) => v === form.recurrence_rule)?.[0] ??
                'custom'
              }
              onValueChange={(v) => {
                if (RRULE_PRESETS[v]) setForm({ ...form, recurrence_rule: RRULE_PRESETS[v] })
              }}
            >
              <SelectTrigger className="col-span-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(RRULE_PRESETS).map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Tuỳ chỉnh RRULE</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 items-center gap-3">
            <Label>RRULE</Label>
            <Input
              className="col-span-2 font-mono text-xs"
              value={form.recurrence_rule}
              onChange={(e) => setForm({ ...form, recurrence_rule: e.target.value })}
              placeholder="FREQ=WEEKLY;BYDAY=MO"
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-3">
            <Label>SLA (giờ)</Label>
            <Input
              type="number"
              className="col-span-2"
              value={form.sla_hours}
              onChange={(e) => setForm({ ...form, sla_hours: Number(e.target.value) })}
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-3">
            <Label>Role mặc định</Label>
            <Input
              className="col-span-2"
              value={form.default_assignee_role}
              onChange={(e) => setForm({ ...form, default_assignee_role: e.target.value })}
            />
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
