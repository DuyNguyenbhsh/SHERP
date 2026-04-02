import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { BudgetVarianceRow, BudgetVarianceQuery } from '../types'

interface ApiResponse {
  status: string
  message: string
  data: BudgetVarianceRow[]
}

async function fetchBudgetVariance(query: BudgetVarianceQuery): Promise<BudgetVarianceRow[]> {
  const params: Record<string, string> = {}
  if (query.project_id) params.project_id = query.project_id
  if (query.year) params.year = String(query.year)

  const { data } = await api.get<ApiResponse>('/reports/budget-variance', {
    params,
  })
  return data.data
}

export function useBudgetVariance(query: BudgetVarianceQuery = {}) {
  return useQuery({
    queryKey: ['reports', 'budget-variance', query],
    queryFn: () => fetchBudgetVariance(query),
  })
}
