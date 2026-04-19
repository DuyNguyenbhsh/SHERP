import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useWorkItemFeed,
  WORK_ITEM_TYPE_LABELS,
  WORK_ITEM_STATUS_LABELS,
} from '@/entities/work-item'

export function InstancesPanel(): React.JSX.Element {
  const { data, isLoading } = useWorkItemFeed({ onlyMine: false, limit: 100 })

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
        Hiển thị tối đa 100 work item toàn hệ. Để filter theo plan, cần backend hỗ trợ
        <code className="mx-1 rounded bg-muted px-1">planId</code> trong query.
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Loại</TableHead>
              <TableHead>Tiêu đề</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-40">Tiến độ</TableHead>
              <TableHead>Hạn</TableHead>
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
                  Chưa có work item nào
                </TableCell>
              </TableRow>
            )}
            {data?.map((it) => (
              <TableRow key={it.id}>
                <TableCell>
                  <Badge variant="outline">{WORK_ITEM_TYPE_LABELS[it.work_item_type]}</Badge>
                </TableCell>
                <TableCell>
                  <Link to={`/work-items/${it.id}`} className="text-primary hover:underline">
                    {it.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={it.status === 'COMPLETED' ? 'default' : 'outline'}>
                    {WORK_ITEM_STATUS_LABELS[it.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Progress value={it.progress_pct} className="h-2" />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {it.due_date ? new Date(it.due_date).toLocaleString('vi-VN') : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
