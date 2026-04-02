import { useEffect, useState, useCallback } from 'react'
import { Loader2, Shield, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useRolePrivileges, useAllPrivileges, useSaveRolePrivileges } from '@/entities/role'
import { getErrorMessage } from '@/shared/api/axios'

/* ================================================================
   1. DATA MODEL — True Matrix Config
   Each cell = exactly ONE privilege_code or null (disabled)
   ================================================================ */

type ActionKey = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'import' | 'export'

interface MatrixItem {
  label: string
  actions: Partial<Record<ActionKey, string>>
}

interface MatrixGroup {
  key: string
  label: string
  items: MatrixItem[]
}

const ACTION_COLS: { key: ActionKey; label: string }[] = [
  { key: 'view', label: 'Xem' },
  { key: 'create', label: 'Thêm' },
  { key: 'edit', label: 'Sửa' },
  { key: 'delete', label: 'Xóa' },
  { key: 'approve', label: 'Duyệt' },
  { key: 'import', label: 'Import' },
  { key: 'export', label: 'Export' },
]

const MATRIX: MatrixGroup[] = [
  {
    key: 'ADMIN',
    label: 'Hệ thống',
    items: [
      {
        label: 'Tài khoản',
        actions: { view: 'VIEW_USERS', edit: 'MANAGE_USER' },
      },
      {
        label: 'Vai trò & Phân quyền',
        actions: { view: 'VIEW_ROLES', edit: 'MANAGE_ROLE' },
      },
      {
        label: 'Sơ đồ tổ chức',
        actions: { edit: 'MANAGE_ORGANIZATION' },
      },
      {
        label: 'Cấu hình phê duyệt',
        actions: { edit: 'MANAGE_APPROVALS', approve: 'APPROVE_REQUESTS' },
      },
      {
        label: 'Quản lý phê duyệt',
        actions: {
          view: 'MANAGE_WORKFLOW',
          create: 'MANAGE_WORKFLOW',
          edit: 'MANAGE_WORKFLOW',
          delete: 'MANAGE_WORKFLOW',
        },
      },
    ],
  },
  {
    key: 'HCM',
    label: 'Nhân sự',
    items: [
      {
        label: 'Nhân viên',
        actions: { view: 'VIEW_EMPLOYEES', edit: 'MANAGE_EMPLOYEE' },
      },
    ],
  },
  {
    key: 'PROJECT',
    label: 'Dự án',
    items: [
      {
        label: 'Quản lý dự án',
        actions: { view: 'VIEW_PROJECTS', edit: 'MANAGE_PROJECTS' },
      },
    ],
  },
  {
    key: 'PROCUREMENT',
    label: 'Mua hàng',
    items: [
      {
        label: 'Đơn mua hàng (PO)',
        actions: {
          view: 'VIEW_PO',
          create: 'CREATE_PO',
          edit: 'UPDATE_PO',
          approve: 'APPROVE_PO',
          export: 'EXPORT_PO',
        },
      },
    ],
  },
  {
    key: 'WMS',
    label: 'Kho vận',
    items: [
      {
        label: 'Tồn kho & Vị trí',
        actions: { view: 'VIEW_INVENTORY', edit: 'MANAGE_INVENTORY', export: 'EXPORT_INVENTORY' },
      },
      {
        label: 'Nhập kho (Inbound)',
        actions: { create: 'RECEIVE_INBOUND', edit: 'MANAGE_INBOUND' },
      },
      {
        label: 'Xuất kho (Outbound)',
        actions: { create: 'SHIP_OUTBOUND', edit: 'MANAGE_OUTBOUND' },
      },
    ],
  },
  {
    key: 'MASTER_DATA',
    label: 'Danh mục',
    items: [
      {
        label: 'Hàng hóa',
        actions: { edit: 'MANAGE_PRODUCT' },
      },
      {
        label: 'Nhà cung cấp',
        actions: { edit: 'MANAGE_SUPPLIER' },
      },
      {
        label: 'Dữ liệu chung',
        actions: {
          edit: 'MANAGE_MASTER_DATA',
          import: 'IMPORT_MASTER_DATA',
          export: 'EXPORT_MASTER_DATA',
        },
      },
    ],
  },
  {
    key: 'TMS',
    label: 'Vận tải',
    items: [
      {
        label: 'Vận đơn & Giao vận',
        actions: { edit: 'MANAGE_TMS' },
      },
      {
        label: 'Đội xe & Tài xế',
        actions: { edit: 'MANAGE_VEHICLE' },
      },
    ],
  },
]

/* Collect all privilege codes from a group */
function groupCodes(group: MatrixGroup): string[] {
  const codes: string[] = []
  for (const item of group.items) {
    for (const code of Object.values(item.actions)) {
      if (code) codes.push(code)
    }
  }
  return codes
}

/* Collect all privilege codes for a given action column */
function colCodes(actionKey: ActionKey): string[] {
  const codes: string[] = []
  for (const group of MATRIX) {
    for (const item of group.items) {
      const code = item.actions[actionKey]
      if (code) codes.push(code)
    }
  }
  return codes
}

/* All codes in the entire matrix */
function allCodes(): string[] {
  const codes: string[] = []
  for (const g of MATRIX) codes.push(...groupCodes(g))
  return codes
}

/* ================================================================
   2. CHECK STATE HELPERS
   ================================================================ */

interface CheckState {
  checked: boolean
  indeterminate: boolean
}

function getCheckState(codes: string[], selected: Set<string>): CheckState {
  if (codes.length === 0) return { checked: false, indeterminate: false }
  const count = codes.filter((c) => selected.has(c)).length
  return {
    checked: count === codes.length,
    indeterminate: count > 0 && count < codes.length,
  }
}

/* ================================================================
   3. COMPONENT
   ================================================================ */

interface PermissionMatrixDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roleId: string | null
  roleName: string
}

export function PermissionMatrixDialog({
  open,
  onOpenChange,
  roleId,
  roleName,
}: PermissionMatrixDialogProps): React.JSX.Element {
  const { data: _allPrivileges, isLoading: loadingAll } = useAllPrivileges()
  const { data: assignedCodes, isLoading: loadingAssigned } = useRolePrivileges(roleId)
  const saveMutation = useSaveRolePrivileges()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (assignedCodes) setSelected(new Set(assignedCodes))
  }, [assignedCodes])

  const isLoading = loadingAll || loadingAssigned

  /* Toggle a single privilege */
  const toggle = useCallback((code: string): void => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }, [])

  /* Toggle a batch of privileges (select-all / deselect-all) */
  const toggleBatch = useCallback((codes: string[]): void => {
    if (codes.length === 0) return
    setSelected((prev) => {
      const next = new Set(prev)
      const allOn = codes.every((c) => next.has(c))
      for (const c of codes) {
        if (allOn) next.delete(c)
        else next.add(c)
      }
      return next
    })
  }, [])

  const handleSave = (): void => {
    if (!roleId) return
    setSaving(true)
    saveMutation.mutate(
      { roleId, privilegeCodes: Array.from(selected) },
      {
        onSuccess: () => {
          toast.success(`Cập nhật quyền cho ${roleName} thành công`)
          onOpenChange(false)
        },
        onError: (err) => toast.error(getErrorMessage(err, 'Lưu thất bại')),
        onSettled: () => setSaving(false),
      },
    )
  }

  /* Master select-all */
  const masterState = getCheckState(allCodes(), selected)

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!saving) onOpenChange(v)
      }}
    >
      <DialogContent className="sm:max-w-[860px] max-h-[88vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {`Ma trận phân quyền`}
          </DialogTitle>
          <DialogDescription>
            {`Vai trò: `}
            <strong>{roleName}</strong>
            {` — Tick chọn quyền cho vai trò này`}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-auto max-h-[calc(88vh-160px)] border-y">
            <table className="w-full border-collapse text-sm">
              {/* ── STICKY HEADER ── */}
              <thead className="sticky top-0 z-10">
                <tr className="bg-muted border-b">
                  {/* Corner cell: sticky both directions */}
                  <th className="sticky left-0 z-20 bg-muted px-4 py-2.5 text-left font-semibold w-[200px] min-w-[200px] border-r">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={masterState.checked}
                        ref={(el) => {
                          if (el) el.indeterminate = masterState.indeterminate
                        }}
                        onChange={() => toggleBatch(allCodes())}
                        className="h-4 w-4 rounded border-gray-300 accent-primary"
                      />
                      <span>{`Chức năng`}</span>
                    </label>
                  </th>
                  {ACTION_COLS.map((col) => {
                    const codes = colCodes(col.key)
                    const st = getCheckState(codes, selected)
                    return (
                      <th
                        key={col.key}
                        className="px-2 py-2.5 text-center font-semibold w-[82px] min-w-[82px]"
                      >
                        <label className="flex flex-col items-center gap-1 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={st.checked}
                            ref={(el) => {
                              if (el) el.indeterminate = st.indeterminate
                            }}
                            onChange={() => toggleBatch(codes)}
                            className="h-3.5 w-3.5 rounded border-gray-300 accent-primary"
                          />
                          <span className="text-[11px] leading-none">{col.label}</span>
                        </label>
                      </th>
                    )
                  })}
                </tr>
              </thead>

              <tbody>
                {MATRIX.map((group) => {
                  const gCodes = groupCodes(group)
                  const gState = getCheckState(gCodes, selected)

                  return (
                    <Fragment key={group.key}>
                      {/* ── GROUP HEADER ROW ── */}
                      <tr className="bg-muted/40 border-t">
                        <td
                          className="sticky left-0 z-[5] bg-muted/40 px-4 py-2 font-semibold text-xs uppercase tracking-wide text-foreground/70 border-r"
                          colSpan={1}
                        >
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={gState.checked}
                              ref={(el) => {
                                if (el) el.indeterminate = gState.indeterminate
                              }}
                              onChange={() => toggleBatch(gCodes)}
                              className="h-3.5 w-3.5 rounded border-gray-300 accent-primary"
                            />
                            <span>{group.label}</span>
                          </label>
                        </td>
                        {ACTION_COLS.map((col) => (
                          <td key={col.key} className="bg-muted/40" />
                        ))}
                      </tr>

                      {/* ── ITEM ROWS ── */}
                      {group.items.map((item, idx) => (
                        <tr
                          key={`${group.key}-${idx}`}
                          className="border-t border-border/50 hover:bg-accent/30 transition-colors"
                        >
                          {/* Sticky first column with indent */}
                          <td className="sticky left-0 z-[5] bg-background px-4 py-1.5 border-r">
                            <span className="pl-6 text-sm text-foreground/80">{item.label}</span>
                          </td>
                          {ACTION_COLS.map((col) => {
                            const code = item.actions[col.key]
                            if (!code) {
                              return (
                                <td key={col.key} className="text-center py-1.5">
                                  <span
                                    className="inline-block w-4 h-4 rounded bg-muted/60"
                                    title="N/A"
                                  />
                                </td>
                              )
                            }
                            return (
                              <td key={col.key} className="text-center py-1.5">
                                <input
                                  type="checkbox"
                                  checked={selected.has(code)}
                                  onChange={() => toggle(code)}
                                  title={code}
                                  className="h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer"
                                />
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <DialogFooter className="px-6 py-3 border-t bg-background">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mr-auto">
            <Check className="h-3.5 w-3.5" />
            <span>
              {selected.size}/{allCodes().length}
              {` quyền được chọn`}
            </span>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {`Hủy`}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {`Lưu phân quyền`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* React.Fragment shortcut for cleaner JSX */
const Fragment = ({ children }: { children: React.ReactNode }): React.JSX.Element => <>{children}</>
