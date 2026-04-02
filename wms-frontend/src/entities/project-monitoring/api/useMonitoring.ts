import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { ProjectHealth, SCurvePoint, ProgressReport, VariationOrder } from '../types'

interface ApiResponse<T> {
  status: string
  data: T
}

// ── Health ──
export function useProjectHealth(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-health', projectId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ProjectHealth>>(
        `/project-monitoring/health/${projectId}`,
      )
      return data.data
    },
    enabled: !!projectId,
  })
}

export function useSCurveData(projectId: string | undefined) {
  return useQuery({
    queryKey: ['s-curve', projectId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<SCurvePoint[]>>(
        `/project-monitoring/s-curve/${projectId}`,
      )
      return data.data
    },
    enabled: !!projectId,
  })
}

// ── Progress Reports ──
export function useProgressReports(projectId: string | undefined) {
  return useQuery({
    queryKey: ['progress-reports', projectId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ProgressReport[]>>('/project-monitoring/reports', {
        params: { project_id: projectId },
      })
      return data.data
    },
    enabled: !!projectId,
  })
}

interface CreateReportPayload {
  project_id: string
  report_period: string
  report_date: string
  summary?: string
  wbs_progress: {
    wbs_id: string
    wbs_code: string
    wbs_name: string
    planned_percent: number
    actual_percent: number
    notes?: string
  }[]
  evidence_attachments: string[]
  evidence_notes?: string
}

export function useCreateReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: CreateReportPayload) => {
      const { data } = await api.post<ApiResponse<ProgressReport>>('/project-monitoring/reports', p)
      return data.data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['progress-reports'] })
      void qc.invalidateQueries({ queryKey: ['project-health'] })
    },
  })
}

function useReportAction(endpoint: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment?: string }) => {
      const { data } = await api.patch<ApiResponse<ProgressReport>>(
        `/project-monitoring/reports/${id}/${endpoint}`,
        { comment },
      )
      return data.data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['progress-reports'] })
      void qc.invalidateQueries({ queryKey: ['project-health'] })
    },
  })
}

export function useSubmitReport() {
  return useReportAction('submit')
}
export function useApproveReport() {
  return useReportAction('approve')
}
export function useRejectReport() {
  return useReportAction('reject')
}

// ── Variation Orders ──
export function useVariationOrders(projectId: string | undefined) {
  return useQuery({
    queryKey: ['variation-orders', projectId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<VariationOrder[]>>('/project-monitoring/vo', {
        params: { project_id: projectId },
      })
      return data.data
    },
    enabled: !!projectId,
  })
}

interface CreateVOPayload {
  project_id: string
  title: string
  description?: string
  vo_type: string
  budget_after?: number
  timeline_after?: string
  scope_description?: string
  reason: string
  attachments?: string[]
}

export function useCreateVO() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: CreateVOPayload) => {
      const { data } = await api.post<ApiResponse<VariationOrder>>('/project-monitoring/vo', p)
      return data.data
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['variation-orders'] }),
  })
}

function useVOAction(endpoint: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment?: string }) => {
      const { data } = await api.patch<ApiResponse<VariationOrder>>(
        `/project-monitoring/vo/${id}/${endpoint}`,
        { comment },
      )
      return data.data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['variation-orders'] })
      void qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useSubmitVO() {
  return useVOAction('submit')
}
export function useApproveVO() {
  return useVOAction('approve')
}
export function useRejectVO() {
  return useVOAction('reject')
}
