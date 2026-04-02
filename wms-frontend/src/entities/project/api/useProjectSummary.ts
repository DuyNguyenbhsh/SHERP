import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { ProjectSummary } from '../types'

interface ApiResponse {
  status: string
  data: ProjectSummary
}

export function useProjectSummary(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-summary', projectId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse>(`/projects/${projectId}/summary`)
      return data.data
    },
    enabled: !!projectId,
  })
}
