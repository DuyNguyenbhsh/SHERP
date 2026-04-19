import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2 } from 'lucide-react'
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
import { useCreateOfficeTask } from '@/entities/office-task'
import { getErrorMessage } from '@/shared/api/axios'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  defaultProjectId?: string
}

export function CreateOfficeTaskDialog({
  open,
  onOpenChange,
  defaultProjectId,
}: Props): React.JSX.Element {
  const createMut = useCreateOfficeTask()
  const [form, setForm] = useState({
    title: '',
    description: '',
    project_id: defaultProjectId ?? '',
    assignee_id: '',
    due_date: '',
  })
  const [items, setItems] = useState<string[]>([])

  useEffect(() => {
    if (open) {
      setForm({
        title: '',
        description: '',
        project_id: defaultProjectId ?? '',
        assignee_id: '',
        due_date: '',
      })
      setItems([])
    }
  }, [open, defaultProjectId])

  const handleSubmit = (): void => {
    if (!form.title || !form.project_id || !form.assignee_id) {
      toast.error('Nhập đủ tiêu đề / project / assignee')
      return
    }
    createMut.mutate(
      {
        title: form.title,
        description: form.description || undefined,
        project_id: form.project_id,
        assignee_id: form.assignee_id,
        due_date: form.due_date || undefined,
        items: items
          .filter((s) => s.trim())
          .map((content, idx) => ({ display_order: idx + 1, content: content.trim() })),
      },
      {
        onSuccess: () => {
          toast.success('Đã tạo Office Task')
          onOpenChange(false)
        },
        onError: (err) => toast.error(getErrorMessage(err, 'Tạo thất bại')),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Tạo Office Task</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-3 items-center gap-3">
            <Label>Tiêu đề *</Label>
            <Input
              className="col-span-2"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
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
            <Label>Assignee UUID *</Label>
            <Input
              className="col-span-2"
              value={form.assignee_id}
              onChange={(e) => setForm({ ...form, assignee_id: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-3">
            <Label>Hạn</Label>
            <Input
              type="datetime-local"
              className="col-span-2"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 items-start gap-3">
            <Label className="pt-2">Mô tả</Label>
            <Textarea
              className="col-span-2"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Sub-items (tick để complete dần)</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setItems((prev) => [...prev, ''])}
              >
                <Plus className="mr-1 h-3 w-3" /> Thêm
              </Button>
            </div>
            {items.map((s, idx) => (
              <div key={idx} className="flex gap-2">
                <Input
                  value={s}
                  onChange={(e) => setItems(items.map((x, i) => (i === idx ? e.target.value : x)))}
                  placeholder={`Item #${idx + 1}`}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setItems(items.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button onClick={handleSubmit} disabled={createMut.isPending}>
            {createMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Tạo task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
