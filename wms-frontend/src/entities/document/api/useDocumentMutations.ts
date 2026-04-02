import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'

export interface CreateDocumentPayload {
  projectId: string
  folderId: string
  document_name: string
  file_url?: string
  mime_type?: string
  expiry_date?: string
  notes?: string
}

export interface UpdateDocumentPayload {
  document_name?: string
  file_url?: string
  mime_type?: string
  expiry_date?: string
  notes?: string
}

async function createDocument({
  projectId,
  folderId,
  ...payload
}: CreateDocumentPayload): Promise<void> {
  await api.post(`/projects/${projectId}/folders/${folderId}/documents`, payload)
}

async function updateDocument({
  id,
  ...payload
}: UpdateDocumentPayload & { id: string }): Promise<void> {
  await api.patch(`/documents/${id}`, payload)
}

async function deleteDocument(id: string): Promise<void> {
  await api.delete(`/documents/${id}`)
}

export function useCreateDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createDocument,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project-folders'] })
      void qc.invalidateQueries({ queryKey: ['document-notifications'] })
    },
  })
}

export function useUpdateDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateDocument,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project-folders'] })
      void qc.invalidateQueries({ queryKey: ['document-notifications'] })
    },
  })
}

export function useDeleteDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project-folders'] })
      void qc.invalidateQueries({ queryKey: ['document-notifications'] })
    },
  })
}
