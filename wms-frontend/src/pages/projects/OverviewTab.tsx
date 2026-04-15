import {
  Loader2,
  MapPin,
  Building2,
  User,
  Ruler,
  Banknote,
  Users,
  Activity,
  Package,
  CircleCheck,
} from 'lucide-react'
import { useProjectSummary } from '@/entities/project'
import { vnd } from './projectDetailUtils'
import { InfoRow, QuickStat } from './SharedCards'

export interface OverviewTabProps {
  projectId: string
}

export function OverviewTab({ projectId }: OverviewTabProps): React.JSX.Element {
  const { data: summary, isLoading } = useProjectSummary(projectId)

  if (isLoading || !summary) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const { project, wbs, boq, team_size, recent_history } = summary

  return (
    <div className="space-y-6">
      {/* Quick stats row */}
      <div className="grid grid-cols-4 gap-4">
        <QuickStat
          icon={<Activity className="h-4 w-4 text-violet-500" />}
          label="Tiến độ WBS"
          value={`${wbs.avg_progress}%`}
          sub={`${wbs.completed_nodes}/${wbs.total_nodes} hoàn thành`}
        />
        <QuickStat
          icon={<Package className="h-4 w-4 text-orange-500" />}
          label="BOQ"
          value={`${boq.total_items} hạng mục`}
          sub={
            boq.over_issued_count > 0 ? `${boq.over_issued_count} vượt định mức` : 'Trong kiểm soát'
          }
          accent={boq.over_issued_count > 0 ? 'red' : undefined}
        />
        <QuickStat
          icon={<Users className="h-4 w-4 text-blue-500" />}
          label="Đội dự án"
          value={`${team_size} người`}
          sub={project.manager?.full_name ?? 'Chưa gán PM'}
        />
        <QuickStat
          icon={<CircleCheck className="h-4 w-4 text-green-500" />}
          label="WBS đang TH"
          value={`${wbs.in_progress_nodes}`}
          sub={`${wbs.total_nodes - wbs.completed_nodes - wbs.in_progress_nodes} chờ`}
        />
      </div>

      {/* Project info + Recent history */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Thông tin dự án
          </h3>
          <div className="rounded-lg border bg-card p-5 space-y-4">
            <InfoRow
              icon={<Building2 className="h-4 w-4" />}
              label="Tổ chức"
              value={project.organization?.organization_name}
            />
            <InfoRow
              icon={<MapPin className="h-4 w-4" />}
              label="Địa điểm"
              value={project.location}
            />
            <InfoRow
              icon={<Ruler className="h-4 w-4" />}
              label="GFA"
              value={
                project.gfa_m2 !== null && project.gfa_m2 !== undefined
                  ? `${Number(project.gfa_m2).toLocaleString('vi-VN')} m²`
                  : null
              }
            />
            <InfoRow
              icon={<Banknote className="h-4 w-4" />}
              label="Ngân sách tổng"
              value={
                project.budget !== null && project.budget !== undefined ? vnd(project.budget) : null
              }
            />
            <InfoRow
              icon={<User className="h-4 w-4" />}
              label="Chủ đầu tư"
              value={project.investor?.name}
            />
            <InfoRow
              icon={<User className="h-4 w-4" />}
              label="Giám đốc dự án"
              value={project.manager?.full_name}
            />
            <InfoRow
              icon={<Building2 className="h-4 w-4" />}
              label="Phòng ban quản lý"
              value={project.department?.organization_name}
            />
            {project.description && (
              <div className="pt-2 border-t">
                <p className="text-xs text-gray-400 mb-1">Mô tả</p>
                <p className="text-sm text-gray-700">{project.description}</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Hoạt động gần đây
          </h3>
          {recent_history.length === 0 ? (
            <div className="flex items-center justify-center rounded-lg border border-dashed py-12 text-sm text-muted-foreground">
              Chưa có hoạt động nào
            </div>
          ) : (
            <div className="rounded-lg border bg-card divide-y">
              {recent_history.map((h) => {
                const fieldLabels: Record<string, string> = {
                  manager_id: 'Giám đốc DA',
                  department_id: 'Phòng ban',
                  investor_id: 'Chủ đầu tư',
                  organization_id: 'Tổ chức',
                  status: 'Trạng thái',
                  stage: 'Giai đoạn',
                  budget: 'Ngân sách',
                }
                const meta = h.metadata as Record<string, string> | null
                const oldDisplay = meta?.old_formatted ?? h.old_label ?? h.old_value ?? '(trống)'
                const newDisplay = meta?.new_formatted ?? h.new_label ?? h.new_value ?? '(trống)'
                return (
                  <div key={h.id} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm">
                        <span className="font-semibold">
                          {fieldLabels[h.field_name] ?? h.field_name}
                        </span>{' '}
                        thay đổi
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(h.changed_at).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs">
                      <span className="rounded bg-red-50 border border-red-200 px-1.5 py-0.5 text-red-700">
                        {oldDisplay}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="rounded bg-green-50 border border-green-200 px-1.5 py-0.5 text-green-700">
                        {newDisplay}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
