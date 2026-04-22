import { Banknote, DollarSign, TrendingUp, TrendingDown } from 'lucide-react'
import { useProjectSummary } from '@/entities/project'
import { vnd } from './projectDetailUtils'

export interface FinanceKpiCardsProps {
  projectId: string
}

export function FinanceKpiCards({ projectId }: FinanceKpiCardsProps): React.JSX.Element {
  const { data: summary, isLoading } = useProjectSummary(projectId)

  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-4 animate-pulse">
            <div className="h-3 w-20 bg-gray-200 rounded mb-3" />
            <div className="h-7 w-32 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    )
  }

  const finance = summary.finance ?? {
    total_budget: 0,
    total_actual: 0,
    variance: 0,
    variance_percent: 0,
    transaction_count: 0,
  }
  const isOverBudget = finance.variance < 0

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Budget */}
      <div className="rounded-xl border bg-blue-50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
            <Banknote className="h-4 w-4 text-blue-600" />
          </div>
          <span className="text-xs font-medium text-blue-600 uppercase tracking-wider">
            Ngân sách
          </span>
        </div>
        <p className="text-2xl font-bold text-gray-900">{vnd(finance.total_budget)}</p>
        <p className="text-xs text-muted-foreground mt-1">Tổng ngân sách phê duyệt</p>
      </div>

      {/* Actual Cost */}
      <div
        className={`rounded-xl border p-4 ${isOverBudget ? 'bg-red-50 border-red-200' : 'bg-green-50'}`}
      >
        <div className="flex items-center gap-2 mb-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${isOverBudget ? 'bg-red-100' : 'bg-green-100'}`}
          >
            <DollarSign className={`h-4 w-4 ${isOverBudget ? 'text-red-600' : 'text-green-600'}`} />
          </div>
          <span
            className={`text-xs font-medium uppercase tracking-wider ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}
          >
            Chi phí thực tế
          </span>
        </div>
        <p className={`text-2xl font-bold ${isOverBudget ? 'text-red-600' : 'text-gray-900'}`}>
          {vnd(finance.total_actual)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{finance.transaction_count} giao dịch</p>
      </div>

      {/* Variance */}
      <div
        className={`rounded-xl border p-4 ${
          isOverBudget ? 'bg-red-50 border-red-200' : 'bg-emerald-50'
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${isOverBudget ? 'bg-red-100' : 'bg-emerald-100'}`}
          >
            {isOverBudget ? (
              <TrendingUp className="h-4 w-4 text-red-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-emerald-600" />
            )}
          </div>
          <span
            className={`text-xs font-medium uppercase tracking-wider ${isOverBudget ? 'text-red-600' : 'text-emerald-600'}`}
          >
            Chênh lệch
          </span>
        </div>
        <p className={`text-2xl font-bold ${isOverBudget ? 'text-red-600' : 'text-emerald-600'}`}>
          {finance.variance >= 0 ? '+' : ''}
          {vnd(finance.variance)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {finance.variance_percent !== 0 && (
            <span className={isOverBudget ? 'text-red-500' : 'text-emerald-500'}>
              {finance.variance_percent > 0 ? '+' : ''}
              {finance.variance_percent}%
            </span>
          )}
          {finance.variance_percent === 0 && 'Cân bằng'} so với ngân sách
        </p>
      </div>
    </div>
  )
}
