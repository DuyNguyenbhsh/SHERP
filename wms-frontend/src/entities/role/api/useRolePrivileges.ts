import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'

interface ApiResponse {
  status: boolean
  data: string[]
}

interface AllPrivilegesResponse {
  status: boolean
  data: { id: string; privilege_code: string; privilege_name: string; module: string }[]
}

export interface PrivilegeInfo {
  id: string
  privilege_code: string
  privilege_name: string
  module: string
}

async function fetchRolePrivileges(roleId: string): Promise<string[]> {
  const { data } = await api.get<ApiResponse>(`/roles/${roleId}/privileges`)
  return data.data ?? (data as unknown as string[])
}

export function useRolePrivileges(roleId: string | null) {
  return useQuery({
    queryKey: ['role-privileges', roleId],
    queryFn: () => fetchRolePrivileges(roleId!),
    enabled: !!roleId,
  })
}

// Fetch ALL privileges in the system (for the matrix)
async function fetchAllPrivileges(): Promise<PrivilegeInfo[]> {
  const { data } = await api.get<AllPrivilegesResponse>('/roles/privileges/all')
  return data.data ?? (data as unknown as PrivilegeInfo[])
}

export function useAllPrivileges() {
  return useQuery({
    queryKey: ['all-privileges'],
    queryFn: fetchAllPrivileges,
  })
}

// Save privilege assignment
interface SavePayload {
  roleId: string
  privilegeCodes: string[]
}

async function saveRolePrivileges(p: SavePayload): Promise<void> {
  await api.put(`/roles/${p.roleId}/privileges`, { privilegeCodes: p.privilegeCodes })
}

export function useSaveRolePrivileges() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: saveRolePrivileges,
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ['role-privileges', vars.roleId] })
    },
  })
}
