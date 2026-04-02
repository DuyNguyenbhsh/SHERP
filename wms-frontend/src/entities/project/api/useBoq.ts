import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { BoqItem, BoqImportRecord } from '../types'

interface ApiResponse<T> {
  status: string
  message: string
  data: T
}

async function fetchBoqItems(projectId: string, wbsId?: string): Promise<BoqItem[]> {
  const params: Record<string, string> = {}
  if (wbsId) params.wbs_id = wbsId
  const { data } = await api.get<ApiResponse<BoqItem[]>>(`/projects/${projectId}/boq`, { params })
  return data.data
}

export function useBoqItems(projectId: string | undefined, wbsId?: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'boq', wbsId],
    queryFn: () => fetchBoqItems(projectId!, wbsId),
    enabled: !!projectId,
  })
}

export interface CreateBoqPayload {
  project_id: string
  item_code: string
  item_name: string
  unit: string
  quantity: number
  unit_price: number
  wbs_id?: string
  product_id?: string
  category_id?: string
  notes?: string
}

export function useCreateBoqItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateBoqPayload) => {
      const { project_id, ...body } = payload
      const { data } = await api.post<ApiResponse<BoqItem>>(`/projects/${project_id}/boq`, body)
      return data.data
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ['projects', v.project_id, 'boq'] })
    },
  })
}

export function useDeleteBoqItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { boq_id: string; project_id: string }) => {
      await api.delete(`/projects/boq/${payload.boq_id}`)
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ['projects', v.project_id, 'boq'] })
    },
  })
}

export function useImportBoq() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { project_id: string; file: File }) => {
      const formData = new FormData()
      formData.append('file', payload.file)
      const { data } = await api.post<ApiResponse<BoqImportRecord>>(
        `/projects/${payload.project_id}/boq/import`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      return data.data
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ['projects', v.project_id, 'boq'] })
    },
  })
}

export function useBoqImportHistory(projectId: string | undefined) {
  return useQuery({
    queryKey: ['projects', projectId, 'boq-imports'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<BoqImportRecord[]>>(
        `/projects/${projectId}/boq/imports`,
      )
      return data.data
    },
    enabled: !!projectId,
  })
}
