import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { ProjectSettlement } from '../types'

interface ApiResponse<T> {
  status: string
  message: string
  data: T
}

export function useSettlements(projectId: string | undefined) {
  return useQuery({
    queryKey: ['projects', projectId, 'settlements'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ProjectSettlement[]>>(
        `/projects/${projectId}/settlements`,
      )
      return data.data
    },
    enabled: !!projectId,
  })
}

export function useSettlementDetail(settlementId: string | undefined) {
  return useQuery({
    queryKey: ['settlements', settlementId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ProjectSettlement>>(
        `/projects/settlements/${settlementId}`,
      )
      return data.data
    },
    enabled: !!settlementId,
  })
}

export function useReconciliationPreview(projectId: string | undefined) {
  return useQuery({
    queryKey: ['projects', projectId, 'reconciliation'],
    queryFn: async () => {
      const { data } = await api.get<
        ApiResponse<{ total_material_in: number; total_material_out: number; lines: unknown[] }>
      >(`/projects/${projectId}/reconciliation/preview`)
      return data.data
    },
    enabled: !!projectId,
  })
}

export function useCreateSettlement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      project_id: string
      settlement_date: string
      notes?: string
      lines: unknown[]
    }) => {
      const { project_id, ...body } = payload
      const { data } = await api.post<ApiResponse<ProjectSettlement>>(
        `/projects/${project_id}/settlements`,
        body,
      )
      return data.data
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ['projects', v.project_id, 'settlements'] })
    },
  })
}

export function useFinalizeSettlement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (settlementId: string) => {
      const { data } = await api.patch<ApiResponse<ProjectSettlement>>(
        `/projects/settlements/${settlementId}/finalize`,
      )
      return data.data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['settlements'] })
    },
  })
}
