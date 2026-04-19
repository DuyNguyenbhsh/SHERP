import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useWorkItem, WORK_ITEM_TYPE_LABELS, WORK_ITEM_STATUS_LABELS } from '@/entities/work-item'
import { ChecklistBody } from '@/features/work-item/ui/ChecklistBody'
import { IncidentBody } from '@/features/work-item/ui/IncidentBody'
import { OfficeTaskBody } from '@/features/work-item/ui/OfficeTaskBody'
import { EnergyInspectionBody } from '@/features/work-item/ui/EnergyInspectionBody'

export function WorkItemDetailPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const { data: item, isLoading } = useWorkItem(id ?? null)

  if (isLoading || !item) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/work-items/feed"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Feed công việc
        </Link>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{WORK_ITEM_TYPE_LABELS[item.work_item_type]}</Badge>
          <h1 className="text-2xl font-semibold">{item.title}</h1>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{WORK_ITEM_STATUS_LABELS[item.status]}</span>
          {item.due_date && <span>Hạn: {new Date(item.due_date).toLocaleString('vi-VN')}</span>}
          <span className="tabular-nums">{item.progress_pct}%</span>
        </div>
        <Progress value={item.progress_pct} className="h-2" />
      </div>

      {!item.subject_id && (
        <div className="rounded-lg border bg-muted/30 p-6 text-sm text-muted-foreground">
          Work item chưa có instance cụ thể — instance sẽ được tạo khi recurrence processor chạy,
          hoặc bạn có thể tạo thủ công qua endpoint module con.
        </div>
      )}

      {item.subject_id && item.work_item_type === 'CHECKLIST' && (
        <ChecklistBody instanceId={item.subject_id} />
      )}
      {item.subject_id && item.work_item_type === 'INCIDENT' && (
        <IncidentBody incidentId={item.subject_id} />
      )}
      {item.subject_id && item.work_item_type === 'OFFICE_TASK' && (
        <OfficeTaskBody taskId={item.subject_id} />
      )}
      {item.subject_id && item.work_item_type === 'ENERGY_INSPECTION' && (
        <EnergyInspectionBody inspectionId={item.subject_id} />
      )}
    </div>
  )
}
