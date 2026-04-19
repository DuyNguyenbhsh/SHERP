import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useTaskTemplatesByPlan } from '@/entities/master-plan'
import { WORK_ITEM_TYPE_LABELS } from '@/entities/work-item'
import type { WorkItemType } from '@/entities/work-item'

interface Props {
  planId: string
}

export function TaskTemplatesPanel({ planId }: Props): React.JSX.Element {
  const { data, isLoading } = useTaskTemplatesByPlan(planId)

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>WBS</TableHead>
            <TableHead>Tên template</TableHead>
            <TableHead>Loại</TableHead>
            <TableHead>Recurrence</TableHead>
            <TableHead className="text-right">SLA</TableHead>
            <TableHead>Sinh lần cuối</TableHead>
            <TableHead>Trạng thái</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
              </TableCell>
            </TableRow>
          )}
          {!isLoading && (data?.length ?? 0) === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                Plan này chưa có Task Template nào — gắn qua WBS Tree tab
              </TableCell>
            </TableRow>
          )}
          {data?.map((t) => (
            <TableRow key={t.id}>
              <TableCell>
                <div className="font-mono text-xs">{t.wbs_code}</div>
                <div className="text-xs text-muted-foreground">{t.wbs_name}</div>
              </TableCell>
              <TableCell>{t.name}</TableCell>
              <TableCell>
                <Badge variant="outline">
                  {WORK_ITEM_TYPE_LABELS[t.work_item_type as WorkItemType] ?? t.work_item_type}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {t.recurrence_rule}
              </TableCell>
              <TableCell className="text-right tabular-nums">{t.sla_hours}h</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {t.last_generated_date ?? '—'}
              </TableCell>
              <TableCell>
                <Badge variant={t.is_active ? 'default' : 'secondary'}>
                  {t.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
