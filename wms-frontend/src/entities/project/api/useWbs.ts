import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { WbsNode, CbsItem } from '../types'

interface ApiResponse<T> {
  status: string
  message: string
  data: T
}

// ── WBS Tree ──

async function fetchWbsTree(projectId: string): Promise<WbsNode[]> {
  const { data } = await api.get<ApiResponse<WbsNode[]>>(`/projects/${projectId}/wbs`)
  return data.data
}

export function useWbsTree(projectId: string | undefined) {
  return useQuery({
    queryKey: ['projects', projectId, 'wbs'],
    queryFn: () => fetchWbsTree(projectId!),
    enabled: !!projectId,
  })
}

// ── CRUD mutations ──

export interface CreateWbsPayload {
  project_id: string
  code: string
  name: string
  parent_id?: string
  department_id?: string
  weight?: number
  sort_order?: number
  planned_start?: string
  planned_end?: string
  description?: string
}

export function useCreateWbs() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateWbsPayload) => {
      const { project_id, ...body } = payload
      const { data } = await api.post<ApiResponse<WbsNode>>(`/projects/${project_id}/wbs`, body)
      return data.data
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ['projects', v.project_id, 'wbs'] })
    },
  })
}

export function useUpdateWbs() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { wbs_id: string; project_id: string; [k: string]: unknown }) => {
      const { wbs_id, project_id: _project_id, ...body } = payload
      const { data } = await api.patch<ApiResponse<WbsNode>>(`/projects/wbs/${wbs_id}`, body)
      return data.data
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ['projects', v.project_id, 'wbs'] })
    },
  })
}

export function useDeleteWbs() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { wbs_id: string; project_id: string }) => {
      await api.delete(`/projects/wbs/${payload.wbs_id}`)
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ['projects', v.project_id, 'wbs'] })
    },
  })
}

export function useUpdateWbsProgress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      wbs_id: string
      project_id: string
      progress_percent: number
    }) => {
      const { data } = await api.patch<ApiResponse<WbsNode>>(
        `/projects/wbs/${payload.wbs_id}/progress`,
        { progress_percent: payload.progress_percent },
      )
      return data.data
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ['projects', v.project_id, 'wbs'] })
    },
  })
}

// ── CBS ──

async function fetchCbs(wbsId: string): Promise<CbsItem[]> {
  const { data } = await api.get<ApiResponse<CbsItem[]>>(`/projects/wbs/${wbsId}/cbs`)
  return data.data
}

export function useCbsByWbs(wbsId: string | undefined) {
  return useQuery({
    queryKey: ['cbs', wbsId],
    queryFn: () => fetchCbs(wbsId!),
    enabled: !!wbsId,
  })
}

export function useUpsertCbs() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      project_id: string
      wbs_id: string
      category_id: string
      planned_amount: number
      notes?: string
    }) => {
      const { project_id, ...body } = payload
      const { data } = await api.post<ApiResponse<CbsItem>>(`/projects/${project_id}/cbs`, body)
      return data.data
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ['cbs', v.wbs_id] })
    },
  })
}
