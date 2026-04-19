import { Link } from 'react-router-dom'
import { Loader2, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import {
  useWorkItemFeed,
  WORK_ITEM_TYPE_LABELS,
  WORK_ITEM_STATUS_LABELS,
  type WorkItem,
} from '@/entities/work-item'

const TYPE_BADGE: Record<WorkItem['work_item_type'], string> = {
  CHECKLIST: 'bg-blue-100 text-blue-800',
  INCIDENT: 'bg-red-100 text-red-800',
  ENERGY_INSPECTION: 'bg-amber-100 text-amber-800',
  OFFICE_TASK: 'bg-slate-100 text-slate-800',
}

function groupByDate(items: WorkItem[]): Record<string, WorkItem[]> {
  const groups: Record<string, WorkItem[]> = {}
  for (const it of items) {
    const key = it.due_date ? new Date(it.due_date).toISOString().slice(0, 10) : 'no-due-date'
    if (!groups[key]) groups[key] = []
    groups[key].push(it)
  }
  return groups
}

function isOverdue(item: WorkItem): boolean {
  if (!item.due_date || item.status === 'COMPLETED') return false
  return new Date(item.due_date).getTime() < Date.now()
}

export function WorkItemsFeedPage(): React.JSX.Element {
  const { data, isLoading } = useWorkItemFeed({ onlyMine: true, limit: 50 })

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const items = data ?? []
  const groups = groupByDate(items)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Công việc của tôi</h1>
        <p className="text-sm text-muted-foreground">
          Feed tổng hợp Checklist · Sự cố · Đọc công tơ · Việc văn phòng
        </p>
      </div>

      {items.length === 0 && (
        <div className="rounded-lg border bg-muted/30 p-12 text-center text-muted-foreground">
          Bạn chưa có công việc nào được giao.
        </div>
      )}

      <div className="space-y-6">
        {Object.entries(groups)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([date, list]) => (
            <div key={date} className="space-y-2">
              <div className="sticky top-0 bg-background pb-1 text-sm font-medium text-muted-foreground">
                {date === 'no-due-date'
                  ? 'Không có hạn'
                  : new Date(date).toLocaleDateString('vi-VN')}
              </div>
              <div className="grid gap-3">
                {list.map((item) => (
                  <Link key={item.id} to={`/work-items/${item.id}`}>
                    <Card
                      className={
                        isOverdue(item)
                          ? 'border-l-4 border-l-red-500 transition hover:shadow-md'
                          : 'transition hover:shadow-md'
                      }
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={TYPE_BADGE[item.work_item_type]}>
                                {WORK_ITEM_TYPE_LABELS[item.work_item_type]}
                              </Badge>
                              <span className="truncate font-medium">{item.title}</span>
                              {isOverdue(item) && (
                                <Badge variant="destructive" className="gap-1">
                                  <AlertCircle className="h-3 w-3" /> Quá hạn
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{WORK_ITEM_STATUS_LABELS[item.status]}</span>
                              {item.due_date && (
                                <>
                                  <span>·</span>
                                  <span>
                                    Hạn: {new Date(item.due_date).toLocaleString('vi-VN')}
                                  </span>
                                </>
                              )}
                            </div>
                            <Progress value={item.progress_pct} className="h-2" />
                          </div>
                          <div className="text-right tabular-nums text-sm font-medium">
                            {item.progress_pct}%
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
