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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ExecutorParty,
  EXECUTOR_PARTY_LABELS,
  FREQ_CODES,
  FREQ_CODE_LABELS,
  useCreateTaskTemplate,
  type FreqCode,
} from '@/entities/master-plan'
import { useFacilitySystems, useFacilityEquipmentItems } from '@/entities/facility-system'
import { WORK_ITEM_TYPE_LABELS } from '@/entities/work-item'
import type { WorkItemType } from '@/entities/work-item'
import { getErrorMessage } from '@/shared/api/axios'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  wbsNodeId: string
  planId?: string
}

const RRULE_PRESETS: Record<string, string> = {
  'Hàng ngày 7h': 'FREQ=DAILY;BYHOUR=7',
  'Thứ 2 hàng tuần 7h': 'FREQ=WEEKLY;BYDAY=MO;BYHOUR=7',
  'Ngày 1 hàng tháng 7h': 'FREQ=MONTHLY;BYMONTHDAY=1;BYHOUR=7',
}

const FREQ_CODE_DEFAULT_RRULE: Partial<Record<FreqCode, string>> = {
  D: 'FREQ=DAILY;BYHOUR=7',
  W: 'FREQ=WEEKLY;BYDAY=MO;BYHOUR=7',
  BW: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO;BYHOUR=7',
  M: 'FREQ=MONTHLY;BYMONTHDAY=1;BYHOUR=7',
  Q: 'FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=1;BYHOUR=7',
  BiQ: 'FREQ=MONTHLY;INTERVAL=4;BYMONTHDAY=1;BYHOUR=7',
  HY: 'FREQ=MONTHLY;INTERVAL=6;BYMONTHDAY=1;BYHOUR=7',
  Y: 'FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=1',
  Y_URGENT: 'FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=1',
}

export function TaskTemplateFormDialog({
  open,
  onOpenChange,
  wbsNodeId,
  planId,
}: Props): React.JSX.Element {
  const createMut = useCreateTaskTemplate(wbsNodeId, planId)
  const { data: systems } = useFacilitySystems()

  const [form, setForm] = useState({
    name: '',
    name_en: '',
    work_item_type: 'CHECKLIST' as WorkItemType,
    recurrence_rule: 'FREQ=WEEKLY;BYDAY=MO;BYHOUR=7',
    sla_hours: 24,
    default_assignee_role: 'TECHNICIAN',
    system_id: '',
    equipment_item_id: '',
    executor_party: ExecutorParty.INTERNAL as ExecutorParty,
    contractor_name: '',
    freq_code: '' as FreqCode | '',
    regulatory_refs_csv: '',
    allow_adhoc_trigger: false,
  })

  const { data: equipmentItems } = useFacilityEquipmentItems(form.system_id || null)

  const showContractor =
    form.executor_party === ExecutorParty.CONTRACTOR || form.executor_party === ExecutorParty.MIXED

  const handleFreqCodeChange = (code: string): void => {
    const next = code === '__none' ? '' : (code as FreqCode)
    setForm((f) => ({
      ...f,
      freq_code: next,
      recurrence_rule: next
        ? (FREQ_CODE_DEFAULT_RRULE[next] ?? f.recurrence_rule)
        : f.recurrence_rule,
      allow_adhoc_trigger: next === 'Y_URGENT' ? true : f.allow_adhoc_trigger,
    }))
  }

  const handleSubmit = (): void => {
    if (!form.name || !form.recurrence_rule) {
      toast.error('Nhập đủ tên và recurrence')
      return
    }
    if (showContractor && !form.contractor_name.trim()) {
      toast.error('Vui lòng nhập tên nhà thầu (bắt buộc khi bên thực hiện là Contractor/Mixed)')
      return
    }
    const regRefs = form.regulatory_refs_csv
      .split(/[\n,;]/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (regRefs.length > 10) {
      toast.error('Tối đa 10 tham chiếu quy chuẩn')
      return
    }
    createMut.mutate(
      {
        name: form.name,
        name_en: form.name_en || undefined,
        work_item_type: form.work_item_type,
        recurrence_rule: form.recurrence_rule,
        sla_hours: form.sla_hours,
        default_assignee_role: form.default_assignee_role || undefined,
        system_id: form.system_id || undefined,
        equipment_item_id: form.equipment_item_id || undefined,
        executor_party: form.executor_party,
        contractor_name: showContractor ? form.contractor_name.trim() : undefined,
        freq_code: form.freq_code || undefined,
        regulatory_refs: regRefs.length ? regRefs : undefined,
        allow_adhoc_trigger: form.allow_adhoc_trigger || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Đã tạo Task Template')
          onOpenChange(false)
        },
        onError: (err) => toast.error(getErrorMessage(err, 'Tạo Task Template thất bại')),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo Task Template (recurrence)</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-3 items-center gap-3">
            <Label>Tên (VI) *</Label>
            <Input
              className="col-span-2"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-3">
            <Label>Tên (EN)</Label>
            <Input
              className="col-span-2"
              placeholder="Weekly Fire Check"
              value={form.name_en}
              onChange={(e) => setForm({ ...form, name_en: e.target.value })}
            />
          </div>

          {/* Taxonomy System/Equipment */}
          <div className="grid grid-cols-3 items-center gap-3">
            <Label>Hệ thống</Label>
            <Select
              value={form.system_id || '__none'}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  system_id: v === '__none' ? '' : v,
                  equipment_item_id: '',
                }))
              }
            >
              <SelectTrigger className="col-span-2">
                <SelectValue placeholder="— Chọn hệ thống —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">— Bỏ qua —</SelectItem>
                {systems?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name_vi}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 items-center gap-3">
            <Label>Hạng mục</Label>
            <Select
              value={form.equipment_item_id || '__none'}
              onValueChange={(v) =>
                setForm({
                  ...form,
                  equipment_item_id: v === '__none' ? '' : v,
                })
              }
              disabled={!form.system_id}
            >
              <SelectTrigger className="col-span-2">
                <SelectValue placeholder="— Chọn hạng mục —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">— Bỏ qua —</SelectItem>
                {equipmentItems?.map((it) => (
                  <SelectItem key={it.id} value={it.id}>
                    {it.name_vi}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          {/* Executor Party (BR-MP-08) */}
          <div className="grid grid-cols-3 items-center gap-3">
            <Label>Bên thực hiện *</Label>
            <Select
              value={form.executor_party}
              onValueChange={(v) => setForm({ ...form, executor_party: v as ExecutorParty })}
            >
              <SelectTrigger className="col-span-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EXECUTOR_PARTY_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {showContractor && (
            <div className="grid grid-cols-3 items-center gap-3">
              <Label>Tên nhà thầu *</Label>
              <Input
                className="col-span-2"
                placeholder="Công ty ABC"
                value={form.contractor_name}
                onChange={(e) => setForm({ ...form, contractor_name: e.target.value })}
              />
            </div>
          )}

          {/* Freq code shortcut */}
          <div className="grid grid-cols-3 items-center gap-3">
            <Label>Mã tần suất</Label>
            <Select value={form.freq_code || '__none'} onValueChange={handleFreqCodeChange}>
              <SelectTrigger className="col-span-2">
                <SelectValue placeholder="— Tuỳ chỉnh qua RRULE —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">— Không chọn —</SelectItem>
                {FREQ_CODES.map((code) => (
                  <SelectItem key={code} value={code}>
                    {code} — {FREQ_CODE_LABELS[code]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 items-center gap-3">
            <Label>Lịch sinh (preset)</Label>
            <Select
              value={
                Object.entries(RRULE_PRESETS).find(([, v]) => v === form.recurrence_rule)?.[0] ??
                'custom'
              }
              onValueChange={(v) => {
                if (RRULE_PRESETS[v]) {
                  setForm({ ...form, recurrence_rule: RRULE_PRESETS[v] })
                }
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
          <div className="grid grid-cols-3 items-start gap-3">
            <Label className="pt-2">
              Tham chiếu quy chuẩn
              <br />
              <span className="text-xs font-normal text-muted-foreground">
                mỗi dòng 1 mục (tối đa 10)
              </span>
            </Label>
            <Textarea
              className="col-span-2 min-h-[72px]"
              placeholder="QCVN 02:2020/BCA&#10;TT 17/2021/TT-BCA"
              value={form.regulatory_refs_csv}
              onChange={(e) => setForm({ ...form, regulatory_refs_csv: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-3">
            <Label>Cho phép ad-hoc</Label>
            <label className="col-span-2 flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={form.allow_adhoc_trigger}
                onChange={(e) => setForm({ ...form, allow_adhoc_trigger: e.target.checked })}
              />
              Task Y/Urgent — kích hoạt ngoài lịch qua Incident escalation
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
