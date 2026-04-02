import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { EvmData } from '../types'

interface ApiResponse<T> {
  status: string
  message: string
  data: T
}

async function fetchEvm(projectId: string): Promise<EvmData> {
  const { data } = await api.get<ApiResponse<EvmData>>(`/projects/${projectId}/earned-value`)
  return data.data
}

export function useEarnedValue(projectId: string | undefined) {
  return useQuery({
    queryKey: ['projects', projectId, 'evm'],
    queryFn: () => fetchEvm(projectId!),
    enabled: !!projectId,
  })
}
