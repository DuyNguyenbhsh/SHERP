import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Loader2,
  FileText,
  History,
  BarChart3,
  ClipboardList,
  DollarSign,
  ShieldCheck,
  Package,
  HardHat,
  Radar,
  GanttChart,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useProjectSummary, useProjectHistory } from '@/entities/project'
import { WbsTab } from '@/features/project/ui/WbsTab'
import { BoqTab } from '@/features/project/ui/BoqTab'
import { EvmTab } from '@/features/project/ui/EvmTab'
import { ApprovalStatusBadge } from '@/features/project/ui/ApprovalStatusBadge'
import { ApprovalTimeline } from '@/features/project/ui/ApprovalTimeline'
import { PlanTab } from '@/features/project/ui/PlanTab'
import { MonitoringTab } from '@/features/project/ui/MonitoringTab'
import { GanttTab } from '@/features/project/ui/GanttTab'

import { stageLabel, statusLabel, statusVariant } from './projectDetailUtils'
import { FinanceKpiCards } from './FinanceKpiCards'
import { OverviewTab } from './OverviewTab'
import { CostTab } from './CostTab'
import { HistoryTab } from './HistoryTab'

export function ProjectDetailPage(): React.JSX.Element {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: summary, isLoading } = useProjectSummary(projectId)
  const { data: history } = useProjectHistory(projectId)

  const project = summary?.project

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="space-y-4">
        <Link to="/projects">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
          </Button>
        </Link>
        <p className="text-muted-foreground">Dự án không tồn tại</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/projects">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{project.project_name}</h1>
              <Badge variant="outline">{stageLabel[project.stage]}</Badge>
              <Badge variant={statusVariant[project.status]}>{statusLabel[project.status]}</Badge>
              <ApprovalStatusBadge entityType="PROJECT_BUDGET" entityId={project.id} />
            </div>
            <p className="text-sm text-muted-foreground">{project.project_code}</p>
          </div>
        </div>
        <Link to={`/projects/${projectId}/documents`}>
          <Button variant="outline" size="sm" className="gap-1">
            <FileText className="h-3.5 w-3.5" /> Tài liệu
          </Button>
        </Link>
      </div>

      {/* ── NV4: Financial KPI Cards ── */}
      <FinanceKpiCards projectId={projectId!} />

      {/* ── Tabs ── */}
      <Tabs defaultValue="overview">
        <TabsList className="flex w-full overflow-x-auto">
          <TabsTrigger value="overview" className="gap-1 flex-1">
            <BarChart3 className="h-3.5 w-3.5" /> Tổng quan
          </TabsTrigger>
          <TabsTrigger value="plan" className="gap-1 flex-1">
            <HardHat className="h-3.5 w-3.5" /> Kế hoạch
          </TabsTrigger>
          <TabsTrigger value="gantt" className="gap-1 flex-1">
            <GanttChart className="h-3.5 w-3.5" /> Tiến độ
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="gap-1 flex-1">
            <Radar className="h-3.5 w-3.5" /> Theo dõi
          </TabsTrigger>
          <TabsTrigger value="wbs" className="gap-1 flex-1">
            <ClipboardList className="h-3.5 w-3.5" /> WBS
          </TabsTrigger>
          <TabsTrigger value="boq" className="gap-1 flex-1">
            <Package className="h-3.5 w-3.5" /> BOQ
          </TabsTrigger>
          <TabsTrigger value="cost" className="gap-1 flex-1">
            <DollarSign className="h-3.5 w-3.5" /> Tài chính
          </TabsTrigger>
          <TabsTrigger value="approval" className="gap-1 flex-1">
            <ShieldCheck className="h-3.5 w-3.5" /> Phê duyệt
            {history && history.length > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-200 px-1.5 text-[10px] font-bold text-gray-600">
                {history.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ══ TAB: TỔNG QUAN ══ */}
        <TabsContent value="overview" className="pt-4">
          <OverviewTab projectId={projectId!} />
        </TabsContent>

        {/* ══ TAB: KẾ HOẠCH THI CÔNG (PROJ1) ══ */}
        <TabsContent value="plan" className="pt-4">
          <PlanTab projectId={projectId!} />
        </TabsContent>

        {/* ══ TAB: TIẾN ĐỘ & GANTT (PROJ3) ══ */}
        <TabsContent value="gantt" className="pt-4">
          <GanttTab projectId={projectId!} />
        </TabsContent>

        {/* ══ TAB: THEO DÕI & ĐIỀU CHỈNH (PROJ2) ══ */}
        <TabsContent value="monitoring" className="pt-4">
          <MonitoringTab projectId={projectId!} />
        </TabsContent>

        {/* ══ TAB: WBS & Tiến độ ══ */}
        <TabsContent value="wbs" className="pt-4 space-y-6">
          <WbsTab projectId={projectId!} />
          <div className="border-t pt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">
              Phân tích EVM (Earned Value)
            </h3>
            <EvmTab projectId={projectId!} />
          </div>
        </TabsContent>

        {/* ══ TAB: BOQ & Vật tư ══ */}
        <TabsContent value="boq" className="pt-4">
          <BoqTab projectId={projectId!} />
        </TabsContent>

        {/* ══ TAB: Chi phí & Tài chính ══ */}
        <TabsContent value="cost" className="pt-4">
          <CostTab projectId={projectId!} />
        </TabsContent>

        {/* ══ TAB: Lịch sử & Phê duyệt ══ */}
        <TabsContent value="approval" className="pt-4">
          <div className="grid grid-cols-2 gap-6">
            {/* Lịch sử thay đổi */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                <History className="h-4 w-4" /> Lịch sử thay đổi
              </h3>
              <HistoryTab projectId={projectId!} />
            </div>

            {/* Luồng phê duyệt */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> Luồng phê duyệt
              </h3>
              <ApprovalTimeline entityType="PROJECT_BUDGET" entityId={projectId!} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
