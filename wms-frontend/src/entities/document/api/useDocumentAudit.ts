import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { DocumentAuditLog } from '../types'

interface ApiResponse<T> {
  status: string
  message: string
  data: T
}

async function fetchAuditLogs(documentId: string): Promise<DocumentAuditLog[]> {
  const { data } = await api.get<ApiResponse<DocumentAuditLog[]>>(
    `/documents/${documentId}/audit-logs`,
  )
  return data.data
}

export function useDocumentAuditLogs(documentId: string | undefined) {
  return useQuery({
    queryKey: ['document-audit-logs', documentId],
    queryFn: () => fetchAuditLogs(documentId!),
    enabled: !!documentId,
  })
}
