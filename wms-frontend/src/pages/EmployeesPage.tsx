import { useState } from 'react'
import { Loader2, Plus, History, Pencil, Trash2, PauseCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  useEmployees,
  useDeleteEmployee,
  useChangeStatus,
  type Employee,
} from '@/entities/employee'
import { useQueryClient } from '@tanstack/react-query'
import { CreateEmployeeDialog } from '@/features/employee/ui/CreateEmployeeDialog'
import { EditEmployeeDialog } from '@/features/employee/ui/EditEmployeeDialog'
import { OrgChartTab } from '@/features/employee/ui/OrgChartTab'
import { AuditLogDialog } from '@/features/employee/ui/AuditLogDialog'
import { TableActions } from '@/shared/ui'
import { getErrorMessage } from '@/shared/api/axios'

type ConfirmAction = { type: 'delete'; emp: Employee } | { type: 'suspend'; emp: Employee }

export function EmployeesPage(): React.JSX.Element {
  const { data: employees, isLoading } = useEmployees()
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Employee | null>(null)
  const [auditTarget, setAuditTarget] = useState<{ id: string; name: string } | null>(null)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const queryClient = useQueryClient()
  const deleteMutation = useDeleteEmployee()
  const statusMutation = useChangeStatus()

  const handleConfirm = (): void => {
    if (!confirmAction) return
    setActionLoading(true)

    if (confirmAction.type === 'delete') {
      deleteMutation.mutate(confirmAction.emp.id, {
        onSuccess: () => {
          toast.success(`Đã xóa nhân viên ${confirmAction.emp.full_name}`)
          setConfirmAction(null)
        },
        onError: (err) => toast.error(getErrorMessage(err, 'Xóa thất bại')),
        onSettled: () => setActionLoading(false),
      })
    } else {
      const newStatus = confirmAction.emp.status === 'SUSPENDED' ? 'WORKING' : 'SUSPENDED'
      statusMutation.mutate(
        {
          id: confirmAction.emp.id,
          status: newStatus,
          reason: newStatus === 'SUSPENDED' ? 'Tạm ngưng công tác' : 'Khôi phục làm việc',
        },
        {
          onSuccess: () => {
            toast.success(
              newStatus === 'SUSPENDED'
                ? `Đã tạm ngưng ${confirmAction.emp.full_name}`
                : `Đã khôi phục ${confirmAction.emp.full_name}`,
            )
            setConfirmAction(null)
          },
          onError: (err) => toast.error(getErrorMessage(err, 'Thao tác thất bại')),
          onSettled: () => setActionLoading(false),
        },
      )
    }
  }

  const getStatusBadge = (status: string): React.JSX.Element => {
    if (status === 'ACTIVE' || status === 'WORKING') {
      return <Badge variant="default">Đang làm việc</Badge>
    }
    if (status === 'SUSPENDED') {
      return <Badge variant="secondary">Tạm ngưng</Badge>
    }
    return <Badge variant="outline">Nghỉ việc</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nhân sự</h1>
          <p className="text-sm text-muted-foreground">Quản lý nhân viên và sơ đồ tổ chức</p>
        </div>
        <div className="flex items-center gap-3">
          <TableActions
            templateUrl="/employees/excel/template"
            importUrl="/employees/excel/import"
            exportUrl="/employees/excel/export"
            importTitle="Import Nhân viên"
            importDescription="Tải lên file Excel để import/cập nhật nhân viên hàng loạt."
            onImportSuccess={() => void queryClient.invalidateQueries({ queryKey: ['employees'] })}
          />
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm nhân viên
          </Button>
        </div>
      </div>

      {/* Dialogs */}
      <CreateEmployeeDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditEmployeeDialog
        open={!!editTarget}
        onOpenChange={(v) => {
          if (!v) setEditTarget(null)
        }}
        employee={editTarget}
      />
      <AuditLogDialog
        open={!!auditTarget}
        onOpenChange={(v) => {
          if (!v) setAuditTarget(null)
        }}
        employeeId={auditTarget?.id ?? null}
        employeeName={auditTarget?.name ?? ''}
      />

      {/* Confirm Dialog */}
      <Dialog
        open={!!confirmAction}
        onOpenChange={(v) => {
          if (!v && !actionLoading) setConfirmAction(null)
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.type === 'delete'
                ? 'Xác nhận xóa nhân viên'
                : 'Xác nhận thay đổi trạng thái'}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.type === 'delete'
                ? `Bạn có chắc muốn xóa nhân viên ${confirmAction?.emp.full_name}? Hành động này sẽ soft delete.`
                : confirmAction?.emp.status === 'SUSPENDED'
                  ? `Khôi phục nhân viên ${confirmAction?.emp.full_name} về trạng thái Đang làm việc?`
                  : `Tạm ngưng nhân viên ${confirmAction?.emp.full_name}?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmAction(null)}
              disabled={actionLoading}
            >
              Hủy
            </Button>
            <Button
              variant={confirmAction?.type === 'delete' ? 'destructive' : 'default'}
              onClick={handleConfirm}
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {confirmAction?.type === 'delete'
                ? 'Xóa'
                : confirmAction?.emp.status === 'SUSPENDED'
                  ? 'Khôi phục'
                  : 'Tạm ngưng'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">Danh sách</TabsTrigger>
          <TabsTrigger value="orgchart">Sơ đồ tổ chức</TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="mt-4">
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã NV</TableHead>
                  <TableHead>Họ Tên</TableHead>
                  <TableHead>Phong ban</TableHead>
                  <TableHead>Chức vụ</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="w-[180px] text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : !employees?.length ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Không có dữ liệu
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell>
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                          {emp.employee_code}
                        </code>
                      </TableCell>
                      <TableCell className="font-medium">{emp.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {emp.department?.organization_name ?? '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {emp.job_title ?? '—'}
                      </TableCell>
                      <TableCell>{getStatusBadge(emp.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            data-testid="btn-edit"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Sửa thông tin"
                            onClick={() => setEditTarget(emp)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            data-testid="btn-suspend"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title={emp.status === 'SUSPENDED' ? 'Khôi phục' : 'Tạm ngưng'}
                            onClick={() => setConfirmAction({ type: 'suspend', emp })}
                          >
                            <PauseCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            data-testid="btn-delete"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            title="Xóa nhân viên"
                            onClick={() => setConfirmAction({ type: 'delete', emp })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            data-testid="btn-audit"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Lịch sử thay đổi"
                            onClick={() => setAuditTarget({ id: emp.id, name: emp.full_name })}
                          >
                            <History className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="orgchart" className="mt-4">
          <OrgChartTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
