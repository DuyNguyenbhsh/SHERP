import { useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useChecklistTemplates } from '@/entities/checklist'
import { CreateChecklistTemplateDialog } from '@/features/checklist/ui/CreateChecklistTemplateDialog'
import { useAuthStore } from '@/features/auth/model/auth.store'

const FREQ_LABELS: Record<string, string> = {
  DAILY: 'Hàng ngày',
  WEEKLY: 'Hàng tuần',
  MONTHLY: 'Hàng tháng',
  SHIFT: 'Theo ca',
}

export function ChecklistTemplatesPage(): React.JSX.Element {
  const canManage = useAuthStore((s) => s.hasPrivilege('MANAGE_CHECKLIST_TEMPLATE'))
  const { data, isLoading } = useChecklistTemplates()
  const [formOpen, setFormOpen] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Checklist Template</h1>
          <p className="text-sm text-muted-foreground">
            Thư viện checklist tái sử dụng — dùng trong Task Template (recurrence)
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Tạo Template
          </Button>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Tần suất</TableHead>
              <TableHead>Loại asset</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            )}
            {!isLoading && (data?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Chưa có Checklist Template nào
                </TableCell>
              </TableRow>
            )}
            {data?.map((tpl) => (
              <TableRow key={tpl.id}>
                <TableCell>
                  <div className="font-medium">{tpl.name}</div>
                  {tpl.description && (
                    <div className="text-xs text-muted-foreground">{tpl.description}</div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{FREQ_LABELS[tpl.frequency] ?? tpl.frequency}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {tpl.asset_type ?? '—'}
                </TableCell>
                <TableCell className="tabular-nums">{tpl.items.length}</TableCell>
                <TableCell>
                  <Badge variant={tpl.is_active ? 'default' : 'secondary'}>
                    {tpl.is_active ? 'Đang dùng' : 'Vô hiệu'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <CreateChecklistTemplateDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  )
}
