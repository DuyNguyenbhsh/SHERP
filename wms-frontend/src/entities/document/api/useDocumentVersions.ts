import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { DocumentVersion } from '../types'

interface ApiResponse<T> {
  status: string
  message: string
  data: T
}

// ── Queries ──

async function fetchVersions(documentId: string): Promise<DocumentVersion[]> {
  const { data } = await api.get<ApiResponse<DocumentVersion[]>>(
    `/documents/${documentId}/versions`,
  )
  return data.data
}

export function useDocumentVersions(documentId: string | undefined) {
  return useQuery({
    queryKey: ['document-versions', documentId],
    queryFn: () => fetchVersions(documentId!),
    enabled: !!documentId,
  })
}

async function fetchVersion(documentId: string, versionId: string): Promise<DocumentVersion> {
  const { data } = await api.get<ApiResponse<DocumentVersion>>(
    `/documents/${documentId}/versions/${versionId}`,
  )
  return data.data
}

export function useDocumentVersion(documentId: string | undefined, versionId: string | undefined) {
  return useQuery({
    queryKey: ['document-version', documentId, versionId],
    queryFn: () => fetchVersion(documentId!, versionId!),
    enabled: !!documentId && !!versionId,
  })
}

// ── Mutations ──

export interface UploadVersionPayload {
  documentId: string
  file: File
  change_note: string
}

async function uploadVersion(payload: UploadVersionPayload): Promise<DocumentVersion> {
  const form = new FormData()
  form.append('file', payload.file)
  form.append('change_note', payload.change_note)
  const { data } = await api.post<ApiResponse<DocumentVersion>>(
    `/documents/${payload.documentId}/versions`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return data.data
}

export function useUploadVersion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: uploadVersion,
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: ['document-versions', vars.documentId] })
      void qc.invalidateQueries({ queryKey: ['project-folders'] })
      void qc.invalidateQueries({ queryKey: ['document-approval-status', vars.documentId] })
      void qc.invalidateQueries({ queryKey: ['document-audit-logs', vars.documentId] })
    },
  })
}

export interface RollbackVersionPayload {
  documentId: string
  versionId: string
  reason: string
}

async function rollbackVersion(payload: RollbackVersionPayload): Promise<DocumentVersion> {
  const { data } = await api.post<ApiResponse<DocumentVersion>>(
    `/documents/${payload.documentId}/versions/${payload.versionId}/rollback`,
    { reason: payload.reason },
  )
  return data.data
}

export function useRollbackVersion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: rollbackVersion,
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: ['document-versions', vars.documentId] })
      void qc.invalidateQueries({ queryKey: ['project-folders'] })
      void qc.invalidateQueries({ queryKey: ['document-audit-logs', vars.documentId] })
    },
  })
}

export interface ArchiveVersionPayload {
  documentId: string
  versionId: string
}

async function archiveVersion(payload: ArchiveVersionPayload): Promise<DocumentVersion> {
  const { data } = await api.patch<ApiResponse<DocumentVersion>>(
    `/documents/${payload.documentId}/versions/${payload.versionId}/archive`,
  )
  return data.data
}

export function useArchiveVersion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: archiveVersion,
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: ['document-versions', vars.documentId] })
      void qc.invalidateQueries({ queryKey: ['document-audit-logs', vars.documentId] })
    },
  })
}
