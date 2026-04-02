import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { ProjectHistoryEntry } from '../types'

interface ApiResponse {
  status: string
  data: ProjectHistoryEntry[]
}

async function fetchHistory(projectId: string): Promise<ProjectHistoryEntry[]> {
  const { data } = await api.get<ApiResponse>(`/projects/${projectId}/history`)
  return data.data
}

export function useProjectHistory(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-history', projectId],
    queryFn: () => fetchHistory(projectId!),
    enabled: !!projectId,
  })
}
