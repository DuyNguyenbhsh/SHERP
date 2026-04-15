import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { DocumentSearchParams, DocumentSearchResult } from '../types'

interface ApiResponse<T> {
  status: string
  message: string
  data: T
}

async function searchDocuments(params: DocumentSearchParams): Promise<DocumentSearchResult> {
  const { data } = await api.get<ApiResponse<DocumentSearchResult>>(`/documents/search`, { params })
  return data.data
}

export function useDocumentSearch(params: DocumentSearchParams) {
  return useQuery({
    queryKey: ['documents-search', params],
    queryFn: () => searchDocuments(params),
    placeholderData: keepPreviousData,
  })
}
