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
import { useCreateMasterPlan, useUpdateMasterPlan, type MasterPlan } from '@/entities/master-plan'
import { getErrorMessage } from '@/shared/api/axios'
import { MasterPlanFormFields } from './MasterPlanFormDialog.helpers'
import type { MasterPlanFormState } from './MasterPlanFormDialog.types'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  target?: MasterPlan | null
}

const emptyForm = (): MasterPlanFormState => ({
  code: '',
  name: '',
  year: new Date().getFullYear(),
  project_id: '',
  budget_vnd: '',
  start_date: '',
  end_date: '',
})

export function MasterPlanFormDialog({ open, onOpenChange, target }: Props): React.JSX.Element {
  const createMut = useCreateMasterPlan()
  const updateMut = useUpdateMasterPlan()
  const isEdit = Boolean(target)

  const [form, setForm] = useState<MasterPlanFormState>(emptyForm)
  const [includeInactive, setIncludeInactive] = useState(false)

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
      setForm(emptyForm())
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
          <MasterPlanFormFields
            form={form}
            setForm={setForm}
            includeInactive={includeInactive}
            setIncludeInactive={setIncludeInactive}
            pending={pending}
          />
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
