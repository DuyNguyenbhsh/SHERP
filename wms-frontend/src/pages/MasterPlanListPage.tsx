import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pencil, CheckCircle2, Lock } from 'lucide-react'
import { toast } from 'sonner'
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
import {
  useMasterPlans,
  useApproveMasterPlan,
  useCloseMasterPlan,
  MASTER_PLAN_STATUS_LABELS,
  type MasterPlan,
} from '@/entities/master-plan'
import { MasterPlanFormDialog } from '@/features/master-plan/ui/MasterPlanFormDialog'
import { useAuthStore } from '@/features/auth/model/auth.store'
import { getErrorMessage } from '@/shared/api/axios'
import { QueryStateRow } from '@/shared/ui'

const STATUS_VARIANT: Record<MasterPlan['status'], 'default' | 'secondary' | 'outline'> = {
  DRAFT: 'outline',
  ACTIVE: 'default',
  CLOSED: 'secondary',
}

export function MasterPlanListPage(): React.JSX.Element {
  const hasPrivilege = useAuthStore((s) => s.hasPrivilege)
  const canManage = hasPrivilege('MANAGE_MASTER_PLAN')
  const canApprove = hasPrivilege('APPROVE_MASTER_PLAN')

  const { data, isLoading, isError, error, refetch } = useMasterPlans()
  const approveMut = useApproveMasterPlan()
  const closeMut = useCloseMasterPlan()
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<MasterPlan | null>(null)

  const formatVnd = (v: string): string => new Intl.NumberFormat('vi-VN').format(Number(v))

  const handleApprove = (p: MasterPlan): void => {
    approveMut.mutate(p.id, {
      onSuccess: () => toast.success(`Đã phê duyệt ${p.code}`),
      onError: (err) => toast.error(getErrorMessage(err, 'Phê duyệt thất bại')),
    })
  }
  const handleClose = (p: MasterPlan): void => {
    closeMut.mutate(p.id, {
      onSuccess: () => toast.success(`Đã đóng ${p.code}`),
      onError: (err) => toast.error(getErrorMessage(err, 'Đóng thất bại')),
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Master Plan</h1>
          <p className="text-sm text-muted-foreground">
            Cây WBS kế hoạch bảo trì / vận hành — sinh Work Item định kỳ
          </p>
        </div>
        {canManage && (
          <Button
            onClick={() => {
              setEditTarget(null)
              setFormOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Tạo Master Plan
          </Button>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã</TableHead>
              <TableHead>Tên</TableHead>
              <TableHead>Năm</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Ngân sách (VND)</TableHead>
              <TableHead className="w-40 text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <QueryStateRow
              colSpan={6}
              isLoading={isLoading}
              isError={isError}
              isEmpty={!isLoading && !isError && (data?.length ?? 0) === 0}
              error={error}
              onRetry={() => void refetch()}
              emptyText='Chưa có Master Plan nào — bấm "Tạo Master Plan" để bắt đầu'
            />
            {!isLoading &&
              !isError &&
              data?.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-sm">
                    <Link to={`/master-plan/${p.id}`} className="text-primary hover:underline">
                      {p.code}
                    </Link>
                  </TableCell>
                  <TableCell>{p.name}</TableCell>
                  <TableCell className="tabular-nums">{p.year}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[p.status]}>
                      {MASTER_PLAN_STATUS_LABELS[p.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatVnd(p.budget_vnd)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {canManage && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditTarget(p)
                            setFormOpen(true)
                          }}
                          title="Sửa"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canApprove && p.status === 'DRAFT' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleApprove(p)}
                          disabled={approveMut.isPending}
                          title="Phê duyệt"
                        >
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                      {canManage && p.status !== 'CLOSED' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleClose(p)}
                          disabled={closeMut.isPending}
                          title="Đóng"
                        >
                          <Lock className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <MasterPlanFormDialog open={formOpen} onOpenChange={setFormOpen} target={editTarget} />
    </div>
  )
}
