import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { ExecutorParty, FreqCode } from '@/entities/master-plan'

interface ApiResponse<T> {
  status?: string | boolean
  message?: string
  data: T
}

export type CellActualStatus = 'NONE' | 'ON_TIME' | 'LATE' | 'MISSED' | 'UPCOMING'

export interface AnnualGridCell {
  iso_week: number
  planned: boolean
  actual_status: CellActualStatus
  instance_ids: string[]
}

export interface AnnualGridRow {
  task_template_id: string
  system: { id: string; name_vi: string; name_en: string | null } | null
  equipment_item: { id: string; name_vi: string; name_en: string | null } | null
  task_name_vi: string
  task_name_en: string | null
  executor_party: ExecutorParty
  contractor_name: string | null
  freq_code: FreqCode | null
  regulatory_refs: string[]
  cells: AnnualGridCell[]
}

export interface AnnualGridResponse {
  year: number
  plan_id: string
  weeks: { iso_week: number }[]
  rows: AnnualGridRow[]
}

export function useAnnualGrid(
  planId: string | null,
  year: number,
): UseQueryResult<AnnualGridResponse> {
  return useQuery({
    queryKey: ['master-plan', planId, 'annual-grid', year],
    queryFn: async (): Promise<AnnualGridResponse> => {
      const { data } = await api.get<ApiResponse<AnnualGridResponse>>(
        `/master-plan/${planId!}/annual-grid`,
        { params: { year } },
      )
      return data.data
    },
    enabled: Boolean(planId),
  })
}

export async function downloadAnnualGridXlsx(
  planId: string,
  year: number,
  filenameHint?: string,
): Promise<void> {
  const response = await api.get<Blob>(`/master-plan/${planId}/export-xlsx`, {
    params: { year },
    responseType: 'blob',
  })
  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filenameHint ?? `MasterPlan_${year}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}
