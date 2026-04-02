import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { Organization } from '../types'

interface ApiResponse {
  status: boolean
  data: Organization[]
}

async function fetchOrganizations(): Promise<Organization[]> {
  const { data } = await api.get<ApiResponse>('/organizations')
  return data.data
}

export function useOrganizations() {
  return useQuery({ queryKey: ['organizations'], queryFn: fetchOrganizations })
}
