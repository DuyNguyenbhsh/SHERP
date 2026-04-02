import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { Employee } from '../types'

interface ApiResponse {
  status: boolean
  data: Employee[]
}

async function fetchUnlinkedEmployees(): Promise<Employee[]> {
  const { data } = await api.get<ApiResponse>('/employees/unlinked')
  return data.data
}

export function useUnlinkedEmployees(): ReturnType<typeof useQuery<Employee[]>> {
  return useQuery({ queryKey: ['employees-unlinked'], queryFn: fetchUnlinkedEmployees })
}
