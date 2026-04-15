import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Clock,
  FileEdit,
  Hourglass,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { DocumentStatus } from '@/entities/document'

const config: Record<
  DocumentStatus,
  {
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
    icon: typeof ShieldCheck
    className?: string
  }
> = {
  VALID: { label: 'Còn hiệu lực', variant: 'default', icon: ShieldCheck },
  EXPIRING_SOON: { label: 'Sắp hết hạn', variant: 'secondary', icon: Clock },
  EXPIRED: { label: 'Đã hết hạn', variant: 'destructive', icon: AlertTriangle },
  DRAFT: { label: 'Nháp', variant: 'outline', icon: FileEdit },
  PENDING_APPROVAL: {
    label: 'Chờ duyệt',
    variant: 'secondary',
    icon: Hourglass,
    className: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  APPROVED: {
    label: 'Đã duyệt',
    variant: 'default',
    icon: CheckCircle2,
    className: 'bg-green-100 text-green-800 border-green-300',
  },
  REJECTED: { label: 'Từ chối', variant: 'destructive', icon: XCircle },
  ARCHIVED: { label: 'Đã lưu trữ', variant: 'outline', icon: Archive },
}

export function DocumentStatusBadge({ status }: { status: DocumentStatus }): React.JSX.Element {
  const cfg = config[status] ?? config.DRAFT
  const Icon = cfg.icon
  return (
    <Badge variant={cfg.variant} className={`gap-1 ${cfg.className ?? ''}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  )
}
