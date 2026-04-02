import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, Pencil, Trash2, Lock, Unlock } from 'lucide-react'
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
import { useUsers, useToggleUserStatus, useDeleteUser, type User } from '@/entities/user'
import { useAuthStore } from '@/features/auth/model/auth.store'
import { getErrorMessage } from '@/shared/api/axios'
import { CreateUserDialog } from '@/features/user/ui/CreateUserDialog'
import { EditUserDialog } from '@/features/user/ui/EditUserDialog'
import { TableActions } from '@/shared/ui/TableActions'

type ConfirmAction = { type: 'delete'; user: User } | { type: 'toggle'; user: User }

export function UsersPage(): React.JSX.Element {
  const queryClient = useQueryClient()
  const { data: users, isLoading } = useUsers()
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const toggleMutation = useToggleUserStatus()
  const deleteMutation = useDeleteUser()

  const currentUser = useAuthStore((s) => s.user)

  const isSelf = (u: User): boolean => u.username === currentUser?.username

  const handleConfirm = (): void => {
    if (!confirmAction) return
    setActionLoading(true)

    if (confirmAction.type === 'delete') {
      deleteMutation.mutate(confirmAction.user.id, {
        onSuccess: () => {
          toast.success(`Đã xóa tài khoản ${confirmAction.user.username}`)
          setConfirmAction(null)
        },
        onError: (err) => toast.error(getErrorMessage(err, 'Xóa thất bại')),
        onSettled: () => setActionLoading(false),
      })
    } else {
      const newActive = !confirmAction.user.is_active
      toggleMutation.mutate(
        { id: confirmAction.user.id, is_active: newActive },
        {
          onSuccess: () => {
            toast.success(
              newActive
                ? `Đã kích hoạt tài khoản ${confirmAction.user.username}`
                : `Đã vô hiệu hóa tài khoản ${confirmAction.user.username}`,
            )
            setConfirmAction(null)
          },
          onError: (err) => toast.error(getErrorMessage(err, 'Thao tác thất bại')),
          onSettled: () => setActionLoading(false),
        },
      )
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tài khoản</h1>
          <p className="text-sm text-muted-foreground">Quản lý tài khoản người dùng hệ thống</p>
        </div>
        <div className="flex items-center gap-3">
          <TableActions
            templateUrl="/users/excel/template"
            importUrl="/users/excel/import"
            exportUrl="/users/excel/export"
            importTitle="Import Tài khoản"
            importDescription="Tải lên file Excel để cập nhật vai trò tài khoản hàng loạt."
            onImportSuccess={() => void queryClient.invalidateQueries({ queryKey: ['users'] })}
          />
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Tạo Tài khoản
          </Button>
        </div>
      </div>

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
                ? 'Xác nhận xóa tài khoản'
                : 'Xác nhận thay đổi trạng thái'}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.type === 'delete'
                ? `Bạn có chắc muốn xóa tài khoản "${confirmAction?.user.username}"? Hành động này không thể hoàn tác.`
                : confirmAction?.user.is_active
                  ? `Vô hiệu hóa tài khoản "${confirmAction?.user.username}"? Người dùng sẽ không thể đăng nhập.`
                  : `Kích hoạt lại tài khoản "${confirmAction?.user.username}"?`}
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
                : confirmAction?.user.is_active
                  ? 'Vô hiệu hóa'
                  : 'Kích hoạt'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Họ tên</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Vai trò</TableHead>
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
            ) : !users?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>{user.employee?.full_name ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.employee?.email ?? '—'}
                  </TableCell>
                  <TableCell>
                    {user.userRoles.map((ur) => (
                      <Badge key={ur.id} variant="secondary" className="mr-1">
                        {ur.role.role_name}
                      </Badge>
                    ))}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? 'default' : 'outline'}>
                      {user.is_active ? 'Hoạt động' : 'Vô hiệu'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Sửa tài khoản"
                        onClick={() => setEditUser(user)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title={user.is_active ? 'Vô hiệu hóa' : 'Kích hoạt'}
                        disabled={isSelf(user)}
                        onClick={() => setConfirmAction({ type: 'toggle', user })}
                      >
                        {user.is_active ? (
                          <Lock className="h-4 w-4" />
                        ) : (
                          <Unlock className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        title="Xóa tài khoản"
                        disabled={isSelf(user)}
                        onClick={() => setConfirmAction({ type: 'delete', user })}
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

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditUserDialog
        open={!!editUser}
        onOpenChange={(v) => {
          if (!v) setEditUser(null)
        }}
        user={editUser}
      />
    </div>
  )
}
