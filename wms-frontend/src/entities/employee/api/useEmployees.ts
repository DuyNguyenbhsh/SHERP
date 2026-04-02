import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { Employee } from '../types'

interface ApiResponse {
  status: boolean
  data: Employee[]
}

async function fetchEmployees(): Promise<Employee[]> {
  const { data } = await api.get<ApiResponse>('/employees')
  return data.data
}

export function useEmployees(): ReturnType<typeof useQuery<Employee[]>> {
  return useQuery({ queryKey: ['employees'], queryFn: fetchEmployees })
}
