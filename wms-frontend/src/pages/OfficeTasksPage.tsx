import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Plus } from 'lucide-react'
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
import { Progress } from '@/components/ui/progress'
import { useOfficeTasks } from '@/entities/office-task'
import { CreateOfficeTaskDialog } from '@/features/office-task/ui/CreateOfficeTaskDialog'
import { useAuthStore } from '@/features/auth/model/auth.store'

export function OfficeTasksPage(): React.JSX.Element {
  const canManage = useAuthStore((s) => s.hasPrivilege('MANAGE_OFFICE_TASK'))
  const [projectId, setProjectId] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const { data, isLoading } = useOfficeTasks({ projectId: projectId || undefined })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Office Task</h1>
          <p className="text-sm text-muted-foreground">
            Công việc văn phòng — tick items → auto complete (BR-OT-01)
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Tạo Task
          </Button>
        )}
      </div>

      <Input
        placeholder="Filter Project UUID"
        value={projectId}
        onChange={(e) => setProjectId(e.target.value)}
        className="max-w-md"
      />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tiêu đề</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="w-48">Tiến độ</TableHead>
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
                  Không có Office Task
                </TableCell>
              </TableRow>
            )}
            {data?.map((t) => {
              const total = t.items.length
              const done = t.items.filter((i) => i.is_done).length
              const pct = total === 0 ? 0 : Math.round((done / total) * 100)
              return (
                <TableRow key={t.id}>
                  <TableCell>
                    {t.work_item_id ? (
                      <Link
                        to={`/work-items/${t.work_item_id}`}
                        className="text-primary hover:underline"
                      >
                        {t.title}
                      </Link>
                    ) : (
                      t.title
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.status === 'COMPLETED' ? 'default' : 'outline'}>
                      {t.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular-nums text-sm">
                    {done}/{total}
                  </TableCell>
                  <TableCell>
                    <Progress value={pct} className="h-2" />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {t.due_date ? new Date(t.due_date).toLocaleString('vi-VN') : '—'}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <CreateOfficeTaskDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        defaultProjectId={projectId || undefined}
      />
    </div>
  )
}
