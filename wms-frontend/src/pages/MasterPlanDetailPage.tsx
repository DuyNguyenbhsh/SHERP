import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Loader2, Plus, CalendarClock, Archive } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useMasterPlan,
  useWbsTree,
  useArchiveWbsNode,
  MASTER_PLAN_STATUS_LABELS,
  WBS_NODE_TYPE_LABELS,
  type WbsNode,
} from '@/entities/master-plan'
import { WbsNodeFormDialog } from '@/features/master-plan/ui/WbsNodeFormDialog'
import { TaskTemplateFormDialog } from '@/features/master-plan/ui/TaskTemplateFormDialog'
import { MasterPlanDashboard } from '@/features/master-plan/ui/MasterPlanDashboard'
import { InstancesPanel } from '@/features/master-plan/ui/InstancesPanel'
import { TaskTemplatesPanel } from '@/features/master-plan/ui/TaskTemplatesPanel'
import { useAuthStore } from '@/features/auth/model/auth.store'
import { getErrorMessage } from '@/shared/api/axios'

export function MasterPlanDetailPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const planId = id ?? ''
  const canManage = useAuthStore((s) => s.hasPrivilege('MANAGE_MASTER_PLAN'))
  const { data: plan, isLoading } = useMasterPlan(planId || null)
  const { data: wbsNodes } = useWbsTree(planId || null)
  const archiveMut = useArchiveWbsNode(planId)

  const [wbsDialog, setWbsDialog] = useState<{ open: boolean; parent?: WbsNode }>({
    open: false,
  })
  const [tplDialog, setTplDialog] = useState<{ open: boolean; nodeId?: string }>({
    open: false,
  })

  if (isLoading || !plan) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const handleArchive = (node: WbsNode): void => {
    archiveMut.mutate(node.id, {
      onSuccess: () => toast.success(`Đã archive ${node.wbs_code}`),
      onError: (err) => toast.error(getErrorMessage(err, 'Archive thất bại')),
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/master-plan"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Danh sách Master Plan
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-2xl font-semibold">{plan.code}</h1>
            <Badge variant={plan.status === 'ACTIVE' ? 'default' : 'outline'}>
              {MASTER_PLAN_STATUS_LABELS[plan.status]}
            </Badge>
          </div>
          <p className="text-muted-foreground">{plan.name}</p>
          <p className="text-sm text-muted-foreground">
            Năm {plan.year} · Ngân sách{' '}
            {new Intl.NumberFormat('vi-VN').format(Number(plan.budget_vnd))} ₫
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="wbs">Cây WBS</TabsTrigger>
          <TabsTrigger value="templates">Task Templates</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="instances">Work Items</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Trạng thái
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">
                  {MASTER_PLAN_STATUS_LABELS[plan.status]}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Số WBS node
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tabular-nums">{wbsNodes?.length ?? 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Start → End
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  {plan.start_date ?? '—'} → {plan.end_date ?? '—'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Người duyệt
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="truncate font-mono text-xs">{plan.approved_by ?? '—'}</div>
                <div className="text-xs text-muted-foreground">
                  {plan.approved_at ? new Date(plan.approved_at).toLocaleString('vi-VN') : ''}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="wbs">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {wbsNodes?.length ?? 0} node · click "Thêm con" để mở rộng
            </p>
            {canManage && (
              <Button size="sm" onClick={() => setWbsDialog({ open: true })}>
                <Plus className="mr-2 h-4 w-4" /> Thêm node gốc
              </Button>
            )}
          </div>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã WBS</TableHead>
                  <TableHead>Tên</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead className="text-right">Ngân sách</TableHead>
                  <TableHead className="w-48 text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(wbsNodes ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Chưa có node nào
                    </TableCell>
                  </TableRow>
                )}
                {wbsNodes?.map((node) => (
                  <TableRow key={node.id}>
                    <TableCell
                      className="font-mono text-sm"
                      style={{ paddingLeft: `${node.level * 12}px` }}
                    >
                      {node.wbs_code}
                    </TableCell>
                    <TableCell>{node.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{WBS_NODE_TYPE_LABELS[node.node_type]}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {new Intl.NumberFormat('vi-VN').format(Number(node.budget_vnd))}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {canManage && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setWbsDialog({ open: true, parent: node })}
                            >
                              <Plus className="mr-1 h-3 w-3" /> Con
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setTplDialog({ open: true, nodeId: node.id })}
                            >
                              <CalendarClock className="mr-1 h-3 w-3" /> Template
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleArchive(node)}
                              title="Archive"
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <TaskTemplatesPanel planId={planId} />
        </TabsContent>

        <TabsContent value="dashboard">
          <MasterPlanDashboard planId={planId} />
        </TabsContent>

        <TabsContent value="instances">
          <InstancesPanel />
        </TabsContent>
      </Tabs>

      <WbsNodeFormDialog
        open={wbsDialog.open}
        onOpenChange={(v) => setWbsDialog({ open: v })}
        planId={planId}
        parentCode={wbsDialog.parent?.wbs_code}
        parentId={wbsDialog.parent?.id}
        parentLevel={wbsDialog.parent?.level}
      />
      {tplDialog.nodeId && (
        <TaskTemplateFormDialog
          open={tplDialog.open}
          onOpenChange={(v) => setTplDialog({ open: v, nodeId: v ? tplDialog.nodeId : undefined })}
          wbsNodeId={tplDialog.nodeId}
        />
      )}
    </div>
  )
}
