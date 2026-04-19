import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Plus, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { IncidentStatus } from '@/entities/incident'
import {
  useIncidents,
  INCIDENT_STATUS_LABELS,
  INCIDENT_SEVERITY_LABELS,
  INCIDENT_CATEGORY_LABELS,
} from '@/entities/incident'
import { CreateIncidentDialog } from '@/features/incident/ui/CreateIncidentDialog'
import { useAuthStore } from '@/features/auth/model/auth.store'

const STATUS_VARIANT: Record<IncidentStatus, 'default' | 'secondary' | 'outline' | 'destructive'> =
  {
    NEW: 'destructive',
    IN_PROGRESS: 'default',
    RESOLVED: 'secondary',
    COMPLETED: 'outline',
  }

export function IncidentsPage(): React.JSX.Element {
  const canReport = useAuthStore((s) => s.hasPrivilege('REPORT_INCIDENT'))
  const [projectId, setProjectId] = useState('')
  const [status, setStatus] = useState<IncidentStatus | 'ALL'>('ALL')
  const [formOpen, setFormOpen] = useState(false)

  const { data, isLoading } = useIncidents({
    projectId: projectId || undefined,
    status: status === 'ALL' ? undefined : status,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sự cố & hư hỏng</h1>
          <p className="text-sm text-muted-foreground">
            Workflow: NEW → assign → IN_PROGRESS → resolve → RESOLVED → close → COMPLETED
          </p>
        </div>
        {canReport && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Báo sự cố
          </Button>
        )}
      </div>

      <div className="flex gap-3">
        <Input
          placeholder="Filter Project UUID"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="max-w-md"
        />
        <Select value={status} onValueChange={(v) => setStatus(v as IncidentStatus | 'ALL')}>
          <SelectTrigger className="max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Mọi trạng thái</SelectItem>
            {Object.entries(INCIDENT_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã</TableHead>
              <TableHead>Tiêu đề</TableHead>
              <TableHead>Mức độ</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Hạn</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            )}
            {!isLoading && (data?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Không có sự cố
                </TableCell>
              </TableRow>
            )}
            {data?.map((inc) => (
              <TableRow key={inc.id}>
                <TableCell className="font-mono text-sm">
                  {inc.work_item_id ? (
                    <Link
                      to={`/work-items/${inc.work_item_id}`}
                      className="text-primary hover:underline"
                    >
                      {inc.incident_code}
                    </Link>
                  ) : (
                    inc.incident_code
                  )}
                </TableCell>
                <TableCell>{inc.title}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      inc.severity === 'CRITICAL' || inc.severity === 'HIGH'
                        ? 'destructive'
                        : 'outline'
                    }
                  >
                    {inc.severity === 'CRITICAL' && <AlertTriangle className="mr-1 h-3 w-3" />}
                    {INCIDENT_SEVERITY_LABELS[inc.severity]}
                  </Badge>
                </TableCell>
                <TableCell>{INCIDENT_CATEGORY_LABELS[inc.category]}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[inc.status]}>
                    {INCIDENT_STATUS_LABELS[inc.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {inc.due_date ? new Date(inc.due_date).toLocaleDateString('vi-VN') : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <CreateIncidentDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        defaultProjectId={projectId || undefined}
      />
    </div>
  )
}
