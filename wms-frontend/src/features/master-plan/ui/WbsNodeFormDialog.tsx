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
import {
  useCreateWbsNode,
  useUpdateWbsNode,
  WbsNodeType,
  WBS_NODE_TYPE_LABELS,
  type WbsNode,
  type WbsNodeType as WbsNodeTypeT,
} from '@/entities/master-plan'
import { getErrorMessage } from '@/shared/api/axios'

type Mode = 'create' | 'edit'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  planId: string
  // create mode
  parentCode?: string
  parentId?: string
  parentLevel?: number
  // edit mode
  mode?: Mode
  node?: WbsNode
}

export function WbsNodeFormDialog({
  open,
  onOpenChange,
  planId,
  parentCode,
  parentId,
  parentLevel,
  mode = 'create',
  node,
}: Props): React.JSX.Element {
  const createMut = useCreateWbsNode(planId)
  const updateMut = useUpdateWbsNode(planId)
  const isEdit = mode === 'edit' && !!node

  const [form, setForm] = useState({
    wbs_code: '',
    name: '',
    node_type: WbsNodeType.WORK_PACKAGE as WbsNodeTypeT,
    budget_vnd: '',
    start_date: '',
    end_date: '',
  })

  useEffect(() => {
    if (isEdit && node) {
      setForm({
        wbs_code: node.wbs_code,
        name: node.name,
        node_type: node.node_type,
        budget_vnd: node.budget_vnd ?? '',
        start_date: node.start_date ?? '',
        end_date: node.end_date ?? '',
      })
    } else {
      setForm({
        wbs_code: parentCode ? `${parentCode}.1` : '1',
        name: '',
        node_type: WbsNodeType.WORK_PACKAGE,
        budget_vnd: '',
        start_date: '',
        end_date: '',
      })
    }
  }, [isEdit, node, parentCode, open])

  const validate = (): string | null => {
    if (!form.name.trim()) return 'Nhập tên node'
    if (!isEdit && !form.wbs_code.trim()) return 'Nhập mã WBS'
    if (form.budget_vnd && !/^\d+$/.test(form.budget_vnd)) {
      return 'Ngân sách phải là số nguyên không âm (VND)'
    }
    if (form.start_date && form.end_date && form.start_date > form.end_date) {
      return 'start_date phải ≤ end_date'
    }
    if (!isEdit) {
      const level = (parentLevel ?? 0) + 1
      if (level > 5) return 'Cây WBS đã đạt tối đa 5 cấp, không thể thêm con'
    }
    return null
  }

  const handleSubmit = (): void => {
    const err = validate()
    if (err) {
      toast.error(err)
      return
    }

    const budget = form.budget_vnd.trim() || undefined
    const start = form.start_date || undefined
    const end = form.end_date || undefined

    if (isEdit && node) {
      updateMut.mutate(
        {
          nodeId: node.id,
          data: {
            name: form.name,
            budget_vnd: budget,
            start_date: start,
            end_date: end,
          },
        },
        {
          onSuccess: () => {
            toast.success('Đã cập nhật WBS node')
            onOpenChange(false)
          },
          onError: (e) => toast.error(getErrorMessage(e, 'Cập nhật thất bại')),
        },
      )
      return
    }

    const level = (parentLevel ?? 0) + 1
    createMut.mutate(
      {
        parent_id: parentId,
        wbs_code: form.wbs_code,
        name: form.name,
        level,
        node_type: form.node_type,
        budget_vnd: budget,
        start_date: start,
        end_date: end,
      },
      {
        onSuccess: () => {
          toast.success('Đã tạo WBS node')
          onOpenChange(false)
        },
        onError: (e) => toast.error(getErrorMessage(e, 'Tạo WBS node thất bại')),
      },
    )
  }

  const busy = createMut.isPending || updateMut.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? `Sửa WBS node (${node?.wbs_code})`
              : `Thêm WBS node ${parentCode ? `(vào ${parentCode})` : '(gốc)'}`}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-3 items-center gap-3">
            <Label>Mã WBS *</Label>
            <Input
              className="col-span-2"
              value={form.wbs_code}
              onChange={(e) => setForm({ ...form, wbs_code: e.target.value })}
              placeholder="1.2.3"
              disabled={isEdit}
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
            <Label>Loại</Label>
            <Select
              value={form.node_type}
              onValueChange={(v) => setForm({ ...form, node_type: v as WbsNodeTypeT })}
              disabled={isEdit}
            >
              <SelectTrigger className="col-span-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(WBS_NODE_TYPE_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 items-center gap-3">
            <Label>Ngân sách (VND)</Label>
            <Input
              className="col-span-2"
              value={form.budget_vnd}
              onChange={(e) => setForm({ ...form, budget_vnd: e.target.value })}
              inputMode="numeric"
              placeholder="0"
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-3">
            <Label>Từ ngày</Label>
            <Input
              type="date"
              className="col-span-2"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-3">
            <Label>Đến ngày</Label>
            <Input
              type="date"
              className="col-span-2"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Lưu thay đổi' : 'Tạo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
