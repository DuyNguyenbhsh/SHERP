import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { DocumentApprovalStatus } from '../types'

interface ApiResponse<T> {
  status: string
  message: string
  data: T
}

async function fetchApprovalStatus(documentId: string): Promise<DocumentApprovalStatus> {
  const { data } = await api.get<ApiResponse<DocumentApprovalStatus>>(
    `/documents/${documentId}/approval-status`,
  )
  return data.data
}

export function useDocumentApprovalStatus(documentId: string | undefined) {
  return useQuery({
    queryKey: ['document-approval-status', documentId],
    queryFn: () => fetchApprovalStatus(documentId!),
    enabled: !!documentId,
  })
}

export interface SubmitApprovalPayload {
  documentId: string
  versionId: string
  note?: string
}

async function submitApproval(payload: SubmitApprovalPayload): Promise<unknown> {
  const { data } = await api.post<unknown>(
    `/documents/${payload.documentId}/versions/${payload.versionId}/submit-approval`,
    { note: payload.note },
  )
  return data
}

export function useSubmitDocumentApproval() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: submitApproval,
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({
        queryKey: ['document-approval-status', vars.documentId],
      })
      void qc.invalidateQueries({ queryKey: ['project-folders'] })
      void qc.invalidateQueries({
        queryKey: ['document-audit-logs', vars.documentId],
      })
    },
  })
}
