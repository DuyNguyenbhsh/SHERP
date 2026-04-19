import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateMasterPlan, useUpdateMasterPlan, type MasterPlan } from '@/entities/master-plan'
import { getErrorMessage } from '@/shared/api/axios'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  target?: MasterPlan | null
}

export function MasterPlanFormDialog({ open, onOpenChange, target }: Props): React.JSX.Element {
  const createMut = useCreateMasterPlan()
  const updateMut = useUpdateMasterPlan()
  const isEdit = Boolean(target)

  const [form, setForm] = useState({
    code: '',
    name: '',
    year: new Date().getFullYear(),
    project_id: '',
    budget_vnd: '',
    start_date: '',
    end_date: '',
  })

  useEffect(() => {
    if (target) {
      setForm({
        code: target.code,
        name: target.name,
        year: target.year,
        project_id: target.project_id,
        budget_vnd: target.budget_vnd ?? '',
        start_date: target.start_date ?? '',
        end_date: target.end_date ?? '',
      })
    } else {
      setForm({
        code: '',
        name: '',
        year: new Date().getFullYear(),
        project_id: '',
        budget_vnd: '',
        start_date: '',
        end_date: '',
      })
    }
  }, [target, open])

  const handleSubmit = (): void => {
    if (!form.code || !form.name || !form.project_id) {
      toast.error('Nhập đủ mã, tên, dự án')
      return
    }
    const payload = {
      code: form.code,
      name: form.name,
      year: Number(form.year),
      project_id: form.project_id,
      budget_vnd: form.budget_vnd || undefined,
      start_date: form.start_date || undefined,
      end_date: form.end_date || undefined,
    }
    const handlers = {
      onSuccess: () => {
        toast.success(isEdit ? 'Đã cập nhật Master Plan' : 'Đã tạo Master Plan')
        onOpenChange(false)
      },
      onError: (err: unknown) => toast.error(getErrorMessage(err, 'Thao tác thất bại')),
    }
    if (isEdit && target) {
      updateMut.mutate({ id: target.id, data: payload }, handlers)
    } else {
      createMut.mutate(payload, handlers)
    }
  }

  const pending = createMut.isPending || updateMut.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Sửa Master Plan' : 'Tạo Master Plan'}</DialogTitle>
          <DialogDescription>
            Khai báo kế hoạch bảo trì / vận hành cho 1 dự án + năm
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-3 items-center gap-3">
            <Label>Mã *</Label>
            <Input
              className="col-span-2"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="MP-2026-TOWER-A"
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
            <Label>Năm *</Label>
            <Input
              type="number"
              className="col-span-2"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-3">
            <Label>Project UUID *</Label>
            <Input
              className="col-span-2"
              value={form.project_id}
              onChange={(e) => setForm({ ...form, project_id: e.target.value })}
              placeholder="a1b2c3d4-..."
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-3">
            <Label>Ngân sách (VND)</Label>
            <Input
              className="col-span-2"
              value={form.budget_vnd}
              onChange={(e) => setForm({ ...form, budget_vnd: e.target.value })}
              placeholder="1250000000"
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-3">
            <Label>Ngày bắt đầu</Label>
            <Input
              type="date"
              className="col-span-2"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-3">
            <Label>Ngày kết thúc</Label>
            <Input
              type="date"
              className="col-span-2"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Huỷ
          </Button>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Cập nhật' : 'Tạo mới'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
