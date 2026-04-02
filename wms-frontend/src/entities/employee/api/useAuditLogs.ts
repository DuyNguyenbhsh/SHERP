import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'

export interface AuditLogEntry {
  id: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE'
  entity_name: string
  entity_id: string
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  changes: Record<string, { old: unknown; new: unknown }> | null
  actor_name: string | null
  reason: string | null
  created_at: string
}

interface ApiResponse {
  status: boolean
  data: AuditLogEntry[]
}

async function fetchAuditLogs(employeeId: string): Promise<AuditLogEntry[]> {
  const { data } = await api.get<ApiResponse>(`/employees/${employeeId}/audit-logs`)
  return data.data
}

export function useAuditLogs(
  employeeId: string | null,
): ReturnType<typeof useQuery<AuditLogEntry[]>> {
  return useQuery({
    queryKey: ['employee-audit-logs', employeeId],
    queryFn: () => fetchAuditLogs(employeeId!),
    enabled: !!employeeId,
  })
}
