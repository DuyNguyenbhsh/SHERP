import { Badge } from '@/components/ui/badge'
import { useApprovalsByEntity } from '@/entities/approval'
import type { ApprovalRequestStatus } from '@/entities/project'

const statusLabel: Record<ApprovalRequestStatus, string> = {
  PENDING: 'Chờ duyệt',
  IN_PROGRESS: 'Đang duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  CANCELED: 'Hủy',
}

const statusVariant: Record<
  ApprovalRequestStatus,
  'outline' | 'default' | 'secondary' | 'destructive'
> = {
  PENDING: 'outline',
  IN_PROGRESS: 'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive',
  CANCELED: 'outline',
}

export function ApprovalStatusBadge({
  entityType,
  entityId,
}: {
  entityType: string
  entityId: string
}): React.JSX.Element | null {
  const { data: requests } = useApprovalsByEntity(entityType, entityId)

  if (!requests || requests.length === 0) return null

  // Lấy request mới nhất
  const latest = requests[0]

  return (
    <Badge variant={statusVariant[latest.status]} className="gap-1 text-xs">
      {statusLabel[latest.status]}
      {latest.status === 'IN_PROGRESS' && (
        <span className="text-[10px]">(Bước {latest.current_step})</span>
      )}
    </Badge>
  )
}
