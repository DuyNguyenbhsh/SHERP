import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, Pencil, Trash2, Settings2, PauseCircle, PlayCircle } from 'lucide-react'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useRoles, useToggleRoleStatus, useDeleteRole, type Role } from '@/entities/role'
import { getErrorMessage } from '@/shared/api/axios'
import { PermissionMatrixDialog } from '@/features/role/ui/PermissionMatrixDialog'
import { CreateRoleDialog } from '@/features/role/ui/CreateRoleDialog'
import { EditRoleDialog } from '@/features/role/ui/EditRoleDialog'
import { TableActions } from '@/shared/ui/TableActions'

const PROTECTED_CODES = ['SUPER_ADMIN']

type ConfirmAction = { type: 'delete'; role: Role } | { type: 'toggle'; role: Role }

export function RolesPage(): React.JSX.Element {
  const queryClient = useQueryClient()
  const { data: roles, isLoading } = useRoles()
  const [createOpen, setCreateOpen] = useState(false)
  const [editRole, setEditRole] = useState<Role | null>(null)
  const [matrixTarget, setMatrixTarget] = useState<{ id: string; name: string } | null>(null)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const toggleMutation = useToggleRoleStatus()
  const deleteMutation = useDeleteRole()

  const isProtected = (r: Role): boolean => PROTECTED_CODES.includes(r.role_code)

  const handleConfirm = (): void => {
    if (!confirmAction) return
    setActionLoading(true)

    if (confirmAction.type === 'delete') {
      deleteMutation.mutate(confirmAction.role.id, {
        onSuccess: () => {
          toast.success('Đã xóa vai trò ' + confirmAction.role.role_code)
          setConfirmAction(null)
        },
        onError: (err) => toast.error(getErrorMessage(err, 'Xóa thất bại')),
        onSettled: () => setActionLoading(false),
      })
    } else {
      toggleMutation.mutate(confirmAction.role.id, {
        onSuccess: () => {
          const msg = confirmAction.role.is_active
            ? 'Đã tạm dừng vai trò ' + confirmAction.role.role_code
            : 'Đã kích hoạt vai trò ' + confirmAction.role.role_code
          toast.success(msg)
          setConfirmAction(null)
        },
        onError: (err) => toast.error(getErrorMessage(err, 'Thao tác thất bại')),
        onSettled: () => setActionLoading(false),
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Phân quyền</h1>
          <p className="text-sm text-muted-foreground">Quản lý vai trò và nhóm quyền hệ thống</p>
        </div>
        <div className="flex items-center gap-3">
          <TableActions
            templateUrl="/roles/excel/template"
            importUrl="/roles/excel/import"
            exportUrl="/roles/excel/export"
            importTitle="Import Vai trò"
            importDescription="Tải lên file Excel để tạo hoặc cập nhật vai trò hàng loạt."
            onImportSuccess={() => void queryClient.invalidateQueries({ queryKey: ['roles'] })}
          />
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm mới
          </Button>
        </div>
      </div>

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
                ? 'Xác nhận xóa vai trò'
                : 'Xác nhận thay đổi trạng thái'}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.type === 'delete'
                ? 'Hành động này không thể hoàn tác. Vai trò sẽ bị xóa vĩnh viễn.'
                : confirmAction?.role.is_active
                  ? 'Tạm dừng vai trò sẽ khiến người dùng thuộc vai trò này mất quyền tương ứng.'
                  : 'Kích hoạt lại vai trò này?'}
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
                : confirmAction?.role.is_active
                  ? 'Tạm dừng'
                  : 'Kích hoạt'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã quyền</TableHead>
              <TableHead>Tên Nhóm Quyền</TableHead>
              <TableHead>Mô tả</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-[240px] text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : !roles?.length ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{role.role_code}</code>
                  </TableCell>
                  <TableCell className="font-medium">{role.role_name}</TableCell>
                  <TableCell className="text-muted-foreground">{role.description ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={role.is_active ? 'default' : 'outline'}>
                      {role.is_active ? 'Hoạt động' : 'Tạm dừng'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setMatrixTarget({ id: role.id, name: role.role_name })}
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                        Phân quyền
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Sửa vai trò"
                        onClick={() => setEditRole(role)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title={role.is_active ? 'Tạm dừng' : 'Kích hoạt'}
                        disabled={isProtected(role)}
                        onClick={() => setConfirmAction({ type: 'toggle', role })}
                      >
                        {role.is_active ? (
                          <PauseCircle className="h-4 w-4" />
                        ) : (
                          <PlayCircle className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        title="Xóa vai trò"
                        disabled={isProtected(role)}
                        onClick={() => setConfirmAction({ type: 'delete', role })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PermissionMatrixDialog
        open={!!matrixTarget}
        onOpenChange={(v) => {
          if (!v) setMatrixTarget(null)
        }}
        roleId={matrixTarget?.id ?? null}
        roleName={matrixTarget?.name ?? ''}
      />
      <CreateRoleDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditRoleDialog
        open={!!editRole}
        onOpenChange={(v) => {
          if (!v) setEditRole(null)
        }}
        role={editRole}
      />
    </div>
  )
}
