import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { Project } from '../types'

interface ApiResponse {
  status: string
  message: string
  data: Project[]
}

async function fetchProjects(): Promise<Project[]> {
  const { data } = await api.get<ApiResponse>('/projects')
  return data.data
}

export function useProjects() {
  return useQuery({ queryKey: ['projects'], queryFn: fetchProjects })
}
