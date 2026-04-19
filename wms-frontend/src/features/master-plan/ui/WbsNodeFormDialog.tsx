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
  WbsNodeType,
  WBS_NODE_TYPE_LABELS,
  type WbsNodeType as WbsNodeTypeT,
} from '@/entities/master-plan'
import { getErrorMessage } from '@/shared/api/axios'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  planId: string
  parentCode?: string
  parentId?: string
  parentLevel?: number
}

export function WbsNodeFormDialog({
  open,
  onOpenChange,
  planId,
  parentCode,
  parentId,
  parentLevel,
}: Props): React.JSX.Element {
  const createMut = useCreateWbsNode(planId)
  const [form, setForm] = useState({
    wbs_code: '',
    name: '',
    node_type: WbsNodeType.WORK_PACKAGE as WbsNodeTypeT,
    budget_vnd: '',
  })

  useEffect(() => {
    setForm({
      wbs_code: parentCode ? `${parentCode}.1` : '1',
      name: '',
      node_type: WbsNodeType.WORK_PACKAGE,
      budget_vnd: '',
    })
  }, [parentCode, open])

  const handleSubmit = (): void => {
    if (!form.wbs_code || !form.name) {
      toast.error('Nhập đủ mã và tên')
      return
    }
    const level = (parentLevel ?? 0) + 1
    createMut.mutate(
      {
        parent_id: parentId,
        wbs_code: form.wbs_code,
        name: form.name,
        level: Math.min(level, 5),
        node_type: form.node_type,
        budget_vnd: form.budget_vnd || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Đã tạo WBS node')
          onOpenChange(false)
        },
        onError: (err) => toast.error(getErrorMessage(err, 'Tạo WBS node thất bại')),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm WBS node {parentCode ? `(vào ${parentCode})` : '(gốc)'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-3 items-center gap-3">
            <Label>Mã WBS *</Label>
            <Input
              className="col-span-2"
              value={form.wbs_code}
              onChange={(e) => setForm({ ...form, wbs_code: e.target.value })}
              placeholder="1.2.3"
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
