import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { ProjectFolder } from '../types'

interface ApiResponse {
  status: string
  data: ProjectFolder[]
}

async function fetchFolders(projectId: string): Promise<ProjectFolder[]> {
  const { data } = await api.get<ApiResponse>(`/projects/${projectId}/folders`)
  return data.data
}

export function useFolders(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-folders', projectId],
    queryFn: () => fetchFolders(projectId!),
    enabled: !!projectId,
  })
}
