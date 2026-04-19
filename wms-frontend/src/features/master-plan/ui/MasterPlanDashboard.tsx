import { useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMasterPlanDashboard } from '@/entities/master-plan'
import { WORK_ITEM_TYPE_LABELS } from '@/entities/work-item'

const COLORS = ['#0a6ed1', '#bb0000', '#e9730c', '#107e3e', '#6a6d70']

interface Props {
  planId: string
}

export function MasterPlanDashboard({ planId }: Props): React.JSX.Element {
  const { data, isLoading } = useMasterPlanDashboard(planId)

  const chartData = useMemo(() => {
    if (!data) return { byType: [], byStatus: [] }
    return {
      byType: Object.entries(data.workItems.byType).map(([k, v]) => ({
        name: WORK_ITEM_TYPE_LABELS[k as keyof typeof WORK_ITEM_TYPE_LABELS] ?? k,
        value: v,
      })),
      byStatus: Object.entries(data.workItems.byStatus).map(([k, v]) => ({
        name: k,
        value: v,
      })),
    }
  }, [data])

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const { workItems, budget } = data

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          label="Tiến độ chung"
          value={`${workItems.progressPct}%`}
          hint={`${workItems.total} work items`}
        />
        <KpiCard
          label="Đúng hạn"
          value={`${workItems.onTimeCompletedPct}%`}
          hint="theo items COMPLETED"
        />
        <KpiCard
          label="Đang quá hạn"
          value={String(workItems.overdueCount)}
          hint="items chưa COMPLETED"
          danger={workItems.overdueCount > 0}
        />
        <KpiCard
          label="Ngân sách WBS"
          value={new Intl.NumberFormat('vi-VN').format(Number(budget.totalBudgetVnd))}
          hint={`VND (${budget.nodeCount} node)`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Work Item theo loại</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {workItems.total === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Chưa có work item
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.byType}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={90}
                  >
                    {chartData.byType.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trạng thái tổng</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {workItems.total === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Chưa có work item
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.byStatus}>
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0a6ed1" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  hint,
  danger,
}: {
  label: string
  value: string
  hint?: string
  danger?: boolean
}): React.JSX.Element {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-semibold tabular-nums ${danger ? 'text-red-600' : ''}`}>
          {value}
        </div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  )
}
