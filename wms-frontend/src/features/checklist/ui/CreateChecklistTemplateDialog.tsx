import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import { Textarea } from '@/components/ui/textarea'
import { api, getErrorMessage } from '@/shared/api/axios'
import { ChecklistFrequency, ChecklistResultType } from '@/entities/checklist'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
}

const FREQ_LABELS: Record<string, string> = {
  DAILY: 'Hàng ngày',
  WEEKLY: 'Hàng tuần',
  MONTHLY: 'Hàng tháng',
  SHIFT: 'Theo ca',
}

const RESULT_TYPE_LABELS: Record<string, string> = {
  PASS_FAIL: 'Đạt / Không đạt',
  VALUE: 'Nhập giá trị',
  PHOTO_ONLY: 'Chỉ ảnh',
  MIXED: 'Hỗn hợp',
}

export function CreateChecklistTemplateDialog({ open, onOpenChange }: Props): React.JSX.Element {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    name: '',
    description: '',
    frequency: ChecklistFrequency.WEEKLY as string,
    asset_type: '',
  })
  const [items, setItems] = useState([
    {
      display_order: 1,
      content: '',
      result_type: ChecklistResultType.PASS_FAIL as string,
      require_photo: false,
      value_unit: '',
    },
  ])

  const createMut = useMutation({
    mutationFn: async (payload: unknown): Promise<unknown> => {
      const response = await api.post<unknown>('/checklists/templates', payload)
      return response.data
    },
    onSuccess: () => {
      toast.success('Đã tạo Checklist Template')
      void qc.invalidateQueries({ queryKey: ['checklists'] })
      onOpenChange(false)
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Tạo thất bại')),
  })

  const addItem = (): void => {
    setItems((prev) => [
      ...prev,
      {
        display_order: prev.length + 1,
        content: '',
        result_type: ChecklistResultType.PASS_FAIL as string,
        require_photo: false,
        value_unit: '',
      },
    ])
  }

  const removeItem = (idx: number): void => {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = (): void => {
    if (!form.name || items.length === 0 || items.some((i) => !i.content)) {
      toast.error('Nhập đủ tên template + nội dung từng item')
      return
    }
    createMut.mutate({
      name: form.name,
      description: form.description || undefined,
      frequency: form.frequency,
      asset_type: form.asset_type || undefined,
      items: items.map((i) => ({
        display_order: i.display_order,
        content: i.content,
        result_type: i.result_type,
        require_photo: i.require_photo,
        value_unit: i.value_unit || undefined,
      })),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo Checklist Template</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-4 items-center gap-3">
            <Label>Tên *</Label>
            <Input
              className="col-span-3"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Checklist PCCC hàng tuần"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-3">
            <Label>Tần suất</Label>
            <Select
              value={form.frequency}
              onValueChange={(v) => setForm({ ...form, frequency: v })}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FREQ_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-3">
            <Label>Loại asset</Label>
            <Input
              className="col-span-3"
              value={form.asset_type}
              onChange={(e) => setForm({ ...form, asset_type: e.target.value })}
              placeholder="FIRE_SAFETY"
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-3">
            <Label className="pt-2">Mô tả</Label>
            <Textarea
              className="col-span-3"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Items ({items.length})</h4>
            <Button type="button" size="sm" variant="outline" onClick={addItem}>
              <Plus className="mr-1 h-3 w-3" /> Thêm item
            </Button>
          </div>
          {items.map((item, idx) => (
            <div key={idx} className="rounded border bg-muted/20 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">#{item.display_order}</span>
                <Input
                  value={item.content}
                  onChange={(e) =>
                    setItems(
                      items.map((x, i) => (i === idx ? { ...x, content: e.target.value } : x)),
                    )
                  }
                  placeholder="Nội dung câu hỏi / hạng mục"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeItem(idx)}
                  disabled={items.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Select
                  value={item.result_type}
                  onValueChange={(v) =>
                    setItems(items.map((x, i) => (i === idx ? { ...x, result_type: v } : x)))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RESULT_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Đơn vị (kWh, °C…)"
                  value={item.value_unit}
                  onChange={(e) =>
                    setItems(
                      items.map((x, i) => (i === idx ? { ...x, value_unit: e.target.value } : x)),
                    )
                  }
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={item.require_photo}
                    onChange={(e) =>
                      setItems(
                        items.map((x, i) =>
                          i === idx ? { ...x, require_photo: e.target.checked } : x,
                        ),
                      )
                    }
                  />
                  Bắt buộc ảnh
                </label>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button onClick={handleSubmit} disabled={createMut.isPending}>
            {createMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lưu template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
