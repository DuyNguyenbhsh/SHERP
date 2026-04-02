import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import {
  ReactFlow,
  type Node,
  type Edge,
  type NodeTypes,
  type NodeProps,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  Handle,
  Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from '@dagrejs/dagre'
import {
  Building2,
  Store,
  Users,
  User,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Lock,
  ChevronDown,
  ChevronRight,
  X,
  Search,
  Maximize,
  FolderKanban,
  Crown,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  useOrganizations,
  useCreateOrganization,
  useUpdateOrganization,
  useDeleteOrganization,
} from '@/entities/organization'
import type { Organization, OrgType } from '@/entities/organization'
import { useProjects, useProjectAssignments } from '@/entities/project'
import type { Project, ProjectAssignment } from '@/entities/project'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// ── Layout ──
const NODE_W = 280
const NODE_H = 80
const PROJECT_NODE_W = 260
const PROJECT_NODE_H = 74

// ══════════════════════════════════════════════════════
// ORG NODE
// ══════════════════════════════════════════════════════

interface OrgNodeData {
  label: string
  code: string
  employeeCount: number
  childCount: number
  orgId: string
  orgType: string
  collapsed: boolean
  hasPM: boolean
  pmNames: string[]
  onContextMenu: (e: React.MouseEvent, orgId: string) => void
  onToggle: (orgId: string) => void
  onClick: (orgId: string) => void
  [key: string]: unknown
}

function OrgNodeComponent({ data }: NodeProps) {
  const d = data as OrgNodeData
  const isStore = d.orgType === 'RETAIL_STORE'

  const border = isStore ? 'border-amber-200' : 'border-blue-200'
  const grad = isStore ? 'from-amber-50' : 'from-blue-50'
  const iconBg = isStore ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
  const handle = isStore ? '!bg-amber-400' : '!bg-blue-400'
  const badgeCls =
    d.employeeCount > 0
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
      : 'bg-gray-100 text-gray-400 border-gray-200'

  return (
    <div
      className={`flex w-[280px] items-center gap-3 rounded-xl border ${border} bg-gradient-to-br ${grad} to-white px-4 py-3 shadow-md transition-shadow hover:shadow-lg cursor-pointer`}
      onClick={() => d.onClick(d.orgId)}
      onContextMenu={(e) => {
        e.preventDefault()
        d.onContextMenu(e, d.orgId)
      }}
    >
      <Handle type="target" position={Position.Top} className={`!h-2 !w-2 ${handle}`} />

      {/* Collapse toggle */}
      {d.childCount > 0 && (
        <button
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-gray-200/60 hover:text-gray-600"
          onClick={(e) => {
            e.stopPropagation()
            d.onToggle(d.orgId)
          }}
        >
          {d.collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
      )}

      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
        {isStore ? <Store className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900">{d.label}</p>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="truncate text-xs text-gray-500">{d.code}</span>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0 text-[10px] font-medium ${badgeCls}`}
          >
            <Users className="h-2.5 w-2.5" />
            {d.employeeCount}
          </span>
        </div>
        {/* PM indicator on org node */}
        {d.hasPM && (
          <div className="mt-0.5 flex items-center gap-1">
            <Crown className="h-2.5 w-2.5 text-violet-500" />
            <span className="truncate text-[10px] font-medium text-violet-600">
              {d.pmNames.join(', ')}
            </span>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className={`!h-2 !w-2 ${handle}`} />
    </div>
  )
}

// ══════════════════════════════════════════════════════
// PROJECT NODE — Distinctive purple styling
// ══════════════════════════════════════════════════════

interface ProjectNodeData {
  label: string
  code: string
  stage: string
  location: string
  memberCount: number
  pmCount: number
  onClick: (projectId: string) => void
  projectId: string
  [key: string]: unknown
}

const stageLabels: Record<string, string> = {
  PLANNING: 'Planning',
  PERMITTING: 'Permitting',
  CONSTRUCTION: 'Construction',
  MANAGEMENT: 'Management',
}

function ProjectNodeComponent({ data }: NodeProps) {
  const d = data as ProjectNodeData

  return (
    <div
      className="flex w-[260px] items-center gap-3 rounded-xl border-2 border-violet-300 bg-gradient-to-br from-violet-50 to-white px-4 py-3 shadow-md transition-shadow hover:shadow-lg cursor-pointer"
      onClick={() => d.onClick(d.projectId)}
    >
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !bg-violet-400" />

      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
        <FolderKanban className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-semibold text-gray-900">{d.label}</p>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="truncate text-xs text-gray-500">{d.code}</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-100 px-1.5 py-0 text-[10px] font-medium text-violet-700">
            {stageLabels[d.stage] ?? d.stage}
          </span>
        </div>
        {d.location && <p className="mt-0.5 truncate text-[10px] text-gray-400">{d.location}</p>}
      </div>

      <div className="flex flex-col items-center gap-0.5">
        <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-1.5 py-0 text-[10px] font-medium text-violet-600">
          <Users className="h-2.5 w-2.5" />
          {d.memberCount}
        </span>
        {d.pmCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0 text-[10px] font-medium text-amber-600">
            <Crown className="h-2.5 w-2.5" />
            {d.pmCount}
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !bg-violet-400" />
    </div>
  )
}

const nodeTypes: NodeTypes = { orgNode: OrgNodeComponent, projectNode: ProjectNodeComponent }

// ══════════════════════════════════════════════════════
// DAGRE LAYOUT
// ══════════════════════════════════════════════════════

function applyDagreLayout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 50, edgesep: 20 })

  for (const node of nodes) {
    const w = node.type === 'projectNode' ? PROJECT_NODE_W : NODE_W
    const h = node.type === 'projectNode' ? PROJECT_NODE_H : NODE_H
    g.setNode(node.id, { width: w, height: h })
  }
  for (const edge of edges) g.setEdge(edge.source, edge.target)

  dagre.layout(g)

  return nodes.map((node) => {
    const pos = g.node(node.id)
    const w = node.type === 'projectNode' ? PROJECT_NODE_W : NODE_W
    const h = node.type === 'projectNode' ? PROJECT_NODE_H : NODE_H
    return { ...node, position: { x: pos.x - w / 2, y: pos.y - h / 2 } }
  })
}

// ══════════════════════════════════════════════════════
// EMPLOYEE SIDEBAR (with project assignments shown)
// ══════════════════════════════════════════════════════

interface SidebarProps {
  org: Organization | null
  project: Project | null
  assignments: ProjectAssignment[]
  onClose: () => void
}

function DetailSidebar({
  org,
  project,
  assignments,
  onClose,
}: SidebarProps): React.JSX.Element | null {
  const [search, setSearch] = useState('')

  // Reset search when selection changes
  useEffect(() => setSearch(''), [org?.id, project?.id])

  if (!org && !project) return null

  // ── Project sidebar ──
  if (project) {
    const projectAssignments = assignments.filter((a) => a.project_id === project.id)
    const pms = projectAssignments.filter((a) => a.role === 'PROJECT_MANAGER')
    const members = projectAssignments.filter((a) => a.role === 'MEMBER')

    return (
      <div className="absolute inset-y-0 right-0 z-20 flex w-[360px] flex-col border-l border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-violet-500" />
              <h3 className="truncate text-sm font-semibold text-gray-900">
                {project.project_name}
              </h3>
            </div>
            <p className="text-xs text-gray-500">
              {project.project_code} &middot; {stageLabels[project.stage]} &middot;{' '}
              {projectAssignments.length} thành viên
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* PMs section */}
          {pms.length > 0 && (
            <div className="border-b border-gray-100">
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-50/50">
                <Crown className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                  Project Managers
                </span>
              </div>
              <ul className="divide-y divide-gray-50">
                {pms.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-4 py-2.5 bg-amber-50/30">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 ring-2 ring-amber-300">
                      <Crown className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-800">
                        {a.employee.full_name}
                      </p>
                      <p className="truncate text-xs text-gray-400">
                        {a.employee.employee_code} &middot;{' '}
                        {a.employee.department?.organization_name ?? '—'}
                      </p>
                    </div>
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">
                      PM
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* Members section */}
          {members.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-50/50">
                <Users className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Thành viên
                </span>
              </div>
              <ul className="divide-y divide-gray-50">
                {members.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                      <User className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-800">
                        {a.employee.full_name}
                      </p>
                      <p className="truncate text-xs text-gray-400">
                        {a.employee.employee_code} &middot;{' '}
                        {a.employee.department?.organization_name ?? '—'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {projectAssignments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Users className="mb-2 h-8 w-8" />
              <p className="text-sm">Chưa có thành viên</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Org sidebar (existing) ──
  const employees = org!.employees ?? []
  const q = search.toLowerCase()
  const filtered = q
    ? employees.filter(
        (e) => e.full_name.toLowerCase().includes(q) || e.employee_code.toLowerCase().includes(q),
      )
    : employees
  const activeCount = employees.filter((e) => e.status === 'ACTIVE').length

  // Find project assignments for employees in this org
  const orgEmpIds = new Set(employees.map((e) => e.id))
  const orgAssignments = assignments.filter((a) => orgEmpIds.has(a.employee_id))

  return (
    <div className="absolute inset-y-0 right-0 z-20 flex w-[360px] flex-col border-l border-gray-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-gray-900">{org!.organization_name}</h3>
          <p className="text-xs text-gray-500">
            {org!.organization_code} &middot; {employees.length} nhân viên ({activeCount} đang làm
            việc)
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="border-b border-gray-100 px-4 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Tìm theo tên hoặc mã NV..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Users className="mb-2 h-8 w-8" />
            <p className="text-sm">{search ? 'Không tìm thấy' : 'Chưa có nhân viên'}</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {filtered.map((emp) => {
              const active = emp.status === 'ACTIVE'
              const empAssignments = orgAssignments.filter((a) => a.employee_id === emp.id)
              const isPM = empAssignments.some((a) => a.role === 'PROJECT_MANAGER')

              return (
                <li
                  key={emp.id}
                  className={`flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 ${isPM ? 'bg-amber-50/40' : ''}`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isPM ? 'bg-amber-100 text-amber-600 ring-2 ring-amber-300' : active ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}
                  >
                    {isPM ? <Crown className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm font-medium text-gray-800 ${isPM ? 'font-semibold' : ''}`}
                    >
                      {emp.full_name}
                    </p>
                    <p className="truncate text-xs text-gray-400">
                      {emp.employee_code} &middot; {emp.email ?? '—'}
                    </p>
                    {empAssignments.length > 0 && (
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {empAssignments.map((a) => (
                          <span
                            key={a.id}
                            className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0 text-[9px] font-medium ${a.role === 'PROJECT_MANAGER' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-violet-100 text-violet-600 border border-violet-200'}`}
                          >
                            <FolderKanban className="h-2 w-2" />
                            {a.project.project_name}
                            {a.role === 'PROJECT_MANAGER' && <Crown className="h-2 w-2 ml-0.5" />}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Badge variant={active ? 'default' : 'outline'} className="text-[10px]">
                    {active ? 'Active' : emp.status}
                  </Badge>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// CONTEXT MENU
// ══════════════════════════════════════════════════════

interface ContextMenuState {
  x: number
  y: number
  orgId: string
  orgName: string
  hasChildren: boolean
  childCount: number
  empCount: number
}

function ContextMenu({
  state,
  onClose,
  onAddChild,
  onEdit,
  onDelete,
}: {
  state: ContextMenuState
  onClose: () => void
  onAddChild: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const blocked = state.hasChildren

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const parts: string[] = []
  if (state.childCount > 0) parts.push(`${state.childCount} đơn vị con`)
  if (state.empCount > 0) parts.push(`${state.empCount} nhân viên`)

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[220px] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-xl"
      style={{ left: state.x, top: state.y }}
    >
      <div className="border-b border-gray-100 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {state.orgName}
        </p>
      </div>
      <button
        className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700"
        onClick={() => {
          onAddChild(state.orgId)
          onClose()
        }}
      >
        <Plus className="h-4 w-4" /> Thêm đơn vị con
      </button>
      <button
        className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-700"
        onClick={() => {
          onEdit(state.orgId)
          onClose()
        }}
      >
        <Pencil className="h-4 w-4" /> Sửa thông tin
      </button>
      <div className="my-1 border-t border-gray-100" />
      {blocked ? (
        <div className="group relative">
          <div className="flex w-full cursor-not-allowed items-center gap-2.5 px-3 py-2 text-sm text-gray-300">
            <Lock className="h-4 w-4" /> Xóa đơn vị
          </div>
          <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-3 py-1.5 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            Cần xóa/chuyển {parts.join(' và ')} trước
            <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      ) : (
        <button
          className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
          onClick={() => {
            onDelete(state.orgId)
            onClose()
          }}
        >
          <Trash2 className="h-4 w-4" /> Xóa đơn vị
        </button>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// ORG DIALOG (Create / Edit)
// ══════════════════════════════════════════════════════

interface OrgDialogState {
  mode: 'create' | 'edit'
  parentId?: string
  parentName?: string
  orgId?: string
  defaults?: { code: string; name: string; description: string; orgType: OrgType }
}

function OrgDialog({
  state,
  onClose,
}: {
  state: OrgDialogState | null
  onClose: () => void
}): React.JSX.Element | null {
  const createMut = useCreateOrganization()
  const updateMut = useUpdateOrganization()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [orgType, setOrgType] = useState<OrgType>('CORPORATE_DEPT')

  useEffect(() => {
    if (state?.mode === 'edit' && state.defaults) {
      setCode(state.defaults.code)
      setName(state.defaults.name)
      setDesc(state.defaults.description)
      setOrgType(state.defaults.orgType)
    } else {
      setCode('')
      setName('')
      setDesc('')
      setOrgType('CORPORATE_DEPT')
    }
  }, [state])

  if (!state) return null
  const isEdit = state.mode === 'edit'
  const loading = createMut.isPending || updateMut.isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim() || !name.trim()) {
      toast.error('Mã và tên đơn vị không được để trống')
      return
    }
    if (isEdit && state.orgId) {
      updateMut.mutate(
        {
          id: state.orgId,
          organization_code: code,
          organization_name: name,
          description: desc || undefined,
          org_type: orgType,
        },
        {
          onSuccess: () => {
            toast.success('Cập nhật thành công')
            onClose()
          },
          onError: (err: any) => toast.error(err.response?.data?.message || 'Cập nhật thất bại'),
        },
      )
    } else {
      createMut.mutate(
        {
          organization_code: code,
          organization_name: name,
          description: desc || undefined,
          parent_id: state.parentId,
          org_type: orgType,
        },
        {
          onSuccess: () => {
            toast.success('Tạo đơn vị thành công')
            onClose()
          },
          onError: (err: any) => toast.error(err.response?.data?.message || 'Tạo đơn vị thất bại'),
        },
      )
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Sửa đơn vị tổ chức' : 'Thêm đơn vị con'}</DialogTitle>
          <DialogDescription>
            {isEdit ? (
              'Cập nhật thông tin đơn vị tổ chức.'
            ) : (
              <>
                Tạo đơn vị con thuộc <strong>{state.parentName}</strong>.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="org_code">Mã đơn vị *</Label>
            <Input
              id="org_code"
              placeholder="VD: SC-TECH"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org_name">Tên đơn vị *</Label>
            <Input
              id="org_name"
              placeholder="VD: Phòng Kỹ thuật"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Loại đơn vị *</Label>
            <Select value={orgType} onValueChange={(v) => setOrgType(v as OrgType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CORPORATE_DEPT">
                  <span className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-blue-500" /> Phòng ban / Công ty
                  </span>
                </SelectItem>
                <SelectItem value="RETAIL_STORE">
                  <span className="flex items-center gap-2">
                    <Store className="h-3.5 w-3.5 text-amber-500" /> Cửa hàng bán lẻ
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org_desc">Mô tả</Label>
            <Input
              id="org_desc"
              placeholder="Mô tả ngắn (tùy chọn)"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Lưu' : 'Tạo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ══════════════════════════════════════════════════════
// DELETE CONFIRM
// ══════════════════════════════════════════════════════

function DeleteConfirmDialog({
  orgId,
  orgName,
  onClose,
}: {
  orgId: string | null
  orgName: string
  onClose: () => void
}): React.JSX.Element | null {
  const deleteMut = useDeleteOrganization()
  const [serverError, setServerError] = useState<string | null>(null)
  if (!orgId) return null
  const handleDelete = () => {
    setServerError(null)
    deleteMut.mutate(orgId, {
      onSuccess: () => {
        toast.success(`Đã xóa "${orgName}"`)
        onClose()
      },
      onError: (err: any) => {
        const msg = err.response?.data?.message || 'Xóa thất bại'
        setServerError(msg)
        toast.error(msg)
      },
    })
  }
  const handleClose = () => {
    setServerError(null)
    onClose()
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
    >
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Xác nhận xóa</DialogTitle>
          <DialogDescription>
            Bạn có chắc chắn muốn xóa đơn vị <strong>{orgName}</strong>?
          </DialogDescription>
        </DialogHeader>
        {serverError && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <p className="text-sm text-red-700">{serverError}</p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={deleteMut.isPending}>
            Hủy
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteMut.isPending}>
            {deleteMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Xóa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ══════════════════════════════════════════════════════
// MAIN — Org + Project chart with assignment edges
// ══════════════════════════════════════════════════════

function OrgChartInner(): React.JSX.Element {
  const { data: organizations, isLoading: orgsLoading } = useOrganizations()
  const { data: projects } = useProjects()
  const { data: assignments } = useProjectAssignments()
  const { fitView } = useReactFlow()

  const [showProjects, setShowProjects] = useState(true)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [sidebarOrgId, setSidebarOrgId] = useState<string | null>(null)
  const [sidebarProjectId, setSidebarProjectId] = useState<string | null>(null)
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null)
  const [orgDialog, setOrgDialog] = useState<OrgDialogState | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const orgMap = useMemo(() => {
    const map = new Map<string, Organization>()
    if (organizations) for (const org of organizations) map.set(org.id, org)
    return map
  }, [organizations])

  const projectMap = useMemo(() => {
    const map = new Map<string, Project>()
    if (projects) for (const p of projects) map.set(p.id, p)
    return map
  }, [projects])

  const sidebarOrg = sidebarOrgId ? (orgMap.get(sidebarOrgId) ?? null) : null
  const sidebarProject = sidebarProjectId ? (projectMap.get(sidebarProjectId) ?? null) : null

  // PM lookup: orgId → PM names (for badge on org node)
  const orgPMs = useMemo(() => {
    const map = new Map<string, string[]>()
    if (!assignments) return map
    for (const a of assignments) {
      if (a.role !== 'PROJECT_MANAGER') continue
      const deptId = a.employee.department?.id
      if (!deptId) continue
      const arr = map.get(deptId) ?? []
      arr.push(a.employee.full_name)
      map.set(deptId, arr)
    }
    return map
  }, [assignments])

  const handleToggle = useCallback((orgId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(orgId)) next.delete(orgId)
      else next.add(orgId)
      return next
    })
  }, [])

  const handleNodeClick = useCallback((orgId: string) => {
    setSidebarProjectId(null)
    setSidebarOrgId((prev) => (prev === orgId ? null : orgId))
  }, [])

  const handleProjectClick = useCallback((projectId: string) => {
    setSidebarOrgId(null)
    setSidebarProjectId((prev) => (prev === projectId ? null : projectId))
  }, [])

  const handleNodeCtx = useCallback(
    (e: React.MouseEvent, orgId: string) => {
      const org = orgMap.get(orgId)
      if (!org) return
      const childCount = org.children?.length ?? 0
      const empCount = org.employees?.length ?? 0
      setCtxMenu({
        x: e.clientX,
        y: e.clientY,
        orgId,
        orgName: org.organization_name,
        hasChildren: childCount > 0 || empCount > 0,
        childCount,
        empCount,
      })
    },
    [orgMap],
  )

  // Visible org IDs (respecting collapsed parents)
  const visibleOrgIds = useMemo(() => {
    if (!organizations?.length) return new Set<string>()
    const visible = new Set<string>()
    const childrenOf = new Map<string | null, Organization[]>()
    for (const org of organizations) {
      const pid = org.parent?.id ?? null
      const arr = childrenOf.get(pid) ?? []
      arr.push(org)
      childrenOf.set(pid, arr)
    }
    const roots = childrenOf.get(null) ?? []
    const queue = [...roots]
    while (queue.length) {
      const org = queue.shift()!
      visible.add(org.id)
      if (!collapsed.has(org.id)) {
        const kids = childrenOf.get(org.id)
        if (kids) queue.push(...kids)
      }
    }
    return visible
  }, [organizations, collapsed])

  // Build graph — org nodes + project nodes + assignment edges
  const { layoutNodes, layoutEdges } = useMemo(() => {
    if (!organizations?.length) return { layoutNodes: [], layoutEdges: [] }

    const nodes: Node[] = []
    const edges: Edge[] = []

    // Org nodes
    for (const org of organizations) {
      if (!visibleOrgIds.has(org.id)) continue

      const deepCount = (id: string): number => {
        const o = orgMap.get(id)
        if (!o) return 0
        let count = o.employees?.length ?? 0
        for (const child of o.children ?? []) count += deepCount(child.id)
        return count
      }

      const directEmps = org.employees?.length ?? 0
      const totalEmps = collapsed.has(org.id) ? deepCount(org.id) : directEmps
      const childCount = org.children?.length ?? 0
      const pmNames = orgPMs.get(org.id) ?? []

      nodes.push({
        id: `org-${org.id}`,
        type: 'orgNode',
        position: { x: 0, y: 0 },
        data: {
          label: org.organization_name,
          code: org.organization_code,
          employeeCount: totalEmps,
          childCount,
          orgId: org.id,
          orgType: org.org_type,
          collapsed: collapsed.has(org.id),
          hasPM: pmNames.length > 0,
          pmNames,
          onContextMenu: handleNodeCtx,
          onToggle: handleToggle,
          onClick: handleNodeClick,
        },
      })

      if (org.parent?.id && visibleOrgIds.has(org.parent.id)) {
        edges.push({
          id: `org-${org.parent.id}->org-${org.id}`,
          source: `org-${org.parent.id}`,
          target: `org-${org.id}`,
          type: 'smoothstep',
          style: {
            stroke: org.org_type === 'RETAIL_STORE' ? '#f59e0b' : '#3b82f6',
            strokeWidth: 2,
          },
        })
      }
    }

    // Project nodes + assignment edges (dashed lines from dept → project)
    if (showProjects && projects?.length) {
      // Only show projects that have assignments (connected to the org chart)
      const projectsWithAssignments = new Set<string>()
      const edgeSet = new Set<string>() // dedup dept→project edges

      if (assignments) {
        for (const a of assignments) {
          projectsWithAssignments.add(a.project_id)
        }
      }

      for (const project of projects) {
        if (!projectsWithAssignments.has(project.id)) continue

        const projectAssignments = assignments?.filter((a) => a.project_id === project.id) ?? []
        const pmCount = projectAssignments.filter((a) => a.role === 'PROJECT_MANAGER').length

        nodes.push({
          id: `prj-${project.id}`,
          type: 'projectNode',
          position: { x: 0, y: 0 },
          data: {
            label: project.project_name,
            code: project.project_code,
            stage: project.stage,
            location: project.location ?? '',
            memberCount: projectAssignments.length,
            pmCount,
            onClick: handleProjectClick,
            projectId: project.id,
          },
        })

        // Draw dashed edges from each unique dept to this project
        for (const a of projectAssignments) {
          const deptId = a.employee.department?.id
          if (!deptId || !visibleOrgIds.has(deptId)) continue
          const edgeKey = `${deptId}->${project.id}`
          if (edgeSet.has(edgeKey)) continue
          edgeSet.add(edgeKey)

          const isPMEdge = projectAssignments.some(
            (pa) => pa.employee.department?.id === deptId && pa.role === 'PROJECT_MANAGER',
          )

          edges.push({
            id: `assign-${edgeKey}`,
            source: `org-${deptId}`,
            target: `prj-${project.id}`,
            type: 'smoothstep',
            animated: true,
            style: {
              stroke: isPMEdge ? '#d97706' : '#8b5cf6',
              strokeWidth: isPMEdge ? 2.5 : 1.5,
              strokeDasharray: '6 3',
            },
            label: isPMEdge ? 'PM' : undefined,
            labelStyle: isPMEdge ? { fill: '#d97706', fontWeight: 700, fontSize: 10 } : undefined,
            labelBgStyle: isPMEdge
              ? { fill: '#fffbeb', stroke: '#fcd34d', strokeWidth: 1 }
              : undefined,
            labelBgPadding: [4, 2] as [number, number],
          })
        }
      }
    }

    return { layoutNodes: applyDagreLayout(nodes, edges), layoutEdges: edges }
  }, [
    organizations,
    projects,
    assignments,
    visibleOrgIds,
    collapsed,
    orgMap,
    orgPMs,
    showProjects,
    handleNodeCtx,
    handleToggle,
    handleNodeClick,
    handleProjectClick,
  ])

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges)

  useEffect(() => {
    setNodes(layoutNodes)
    setEdges(layoutEdges)
    setTimeout(() => fitView({ padding: 0.15 }), 80)
  }, [layoutNodes, layoutEdges, setNodes, setEdges, fitView])

  // CRUD handlers
  const handleAddChild = useCallback(
    (orgId: string) => {
      const org = orgMap.get(orgId)
      setOrgDialog({ mode: 'create', parentId: orgId, parentName: org?.organization_name ?? '' })
    },
    [orgMap],
  )

  const handleEdit = useCallback(
    (orgId: string) => {
      const org = orgMap.get(orgId)
      if (!org) return
      setOrgDialog({
        mode: 'edit',
        orgId,
        defaults: {
          code: org.organization_code,
          name: org.organization_name,
          description: org.description ?? '',
          orgType: org.org_type,
        },
      })
    },
    [orgMap],
  )

  const handleDelete = useCallback(
    (orgId: string) => {
      const org = orgMap.get(orgId)
      if (!org) return
      setDeleteTarget({ id: orgId, name: org.organization_name })
    },
    [orgMap],
  )

  if (orgsLoading) {
    return (
      <div className="flex min-h-[600px] items-center justify-center rounded-lg border bg-card">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!layoutNodes.length) {
    return (
      <div className="flex min-h-[600px] flex-col items-center justify-center rounded-lg border border-dashed bg-card p-12">
        <Building2 className="mb-4 h-12 w-12 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Chưa có dữ liệu tổ chức</p>
      </div>
    )
  }

  return (
    <>
      {/* Legend + toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded border border-blue-300 bg-blue-100" /> Phòng
          ban
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded border border-amber-300 bg-amber-100" /> Cửa
          hàng
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded border-2 border-violet-300 bg-violet-100" />{' '}
          Dự án
        </span>
        <span className="flex items-center gap-1.5">
          <Crown className="h-3 w-3 text-amber-500" /> Project Manager
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0 w-5 border-t-2 border-dashed border-violet-400" /> Phân
          công
        </span>
        <span className="ml-auto flex items-center gap-2">
          <Button
            variant={showProjects ? 'default' : 'outline'}
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => setShowProjects(!showProjects)}
          >
            <FolderKanban className="h-3 w-3" /> Dự án
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => fitView({ padding: 0.15 })}
          >
            <Maximize className="h-3 w-3" /> Zoom to fit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => setCollapsed(new Set())}
          >
            Mở tất cả
          </Button>
        </span>
      </div>

      {/* Chart + sidebar wrapper */}
      <div className="relative h-[650px] overflow-hidden rounded-lg border bg-white shadow-sm">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.1}
          maxZoom={2}
          defaultEdgeOptions={{ type: 'smoothstep' }}
          proOptions={{ hideAttribution: true }}
          onPaneClick={() => {
            setCtxMenu(null)
            setSidebarOrgId(null)
            setSidebarProjectId(null)
          }}
        >
          <Background gap={24} size={1} color="#f1f5f9" />
          <Controls
            showInteractive={false}
            className="!rounded-lg !border !border-gray-200 !bg-white !shadow-sm"
          />
          <MiniMap
            nodeColor={(node) => {
              if (node.type === 'projectNode') return '#c4b5fd'
              return (node.data as OrgNodeData).orgType === 'RETAIL_STORE' ? '#fcd34d' : '#93c5fd'
            }}
            maskColor="rgba(0,0,0,0.06)"
            className="!rounded-lg !border !border-gray-200 !shadow-sm"
          />
        </ReactFlow>

        {/* Sidebar */}
        <DetailSidebar
          org={sidebarOrg}
          project={sidebarProject}
          assignments={assignments ?? []}
          onClose={() => {
            setSidebarOrgId(null)
            setSidebarProjectId(null)
          }}
        />
      </div>

      {ctxMenu && (
        <ContextMenu
          state={ctxMenu}
          onClose={() => setCtxMenu(null)}
          onAddChild={handleAddChild}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
      <OrgDialog state={orgDialog} onClose={() => setOrgDialog(null)} />
      <DeleteConfirmDialog
        orgId={deleteTarget?.id ?? null}
        orgName={deleteTarget?.name ?? ''}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  )
}

// ══════════════════════════════════════════════════════
// EXPORT
// ══════════════════════════════════════════════════════

export function OrgChartTab(): React.JSX.Element {
  return (
    <ReactFlowProvider>
      <OrgChartInner />
    </ReactFlowProvider>
  )
}
