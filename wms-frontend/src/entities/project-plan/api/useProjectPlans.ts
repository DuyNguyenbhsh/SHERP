import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { ProjectPlan, PlanNotification } from '../types'

interface ApiResponse<T> {
  status: string
  message: string
  data: T
}

export function useProjectPlans(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-plans', projectId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ProjectPlan[]>>('/project-plans', {
        params: { project_id: projectId },
      })
      return data.data
    },
    enabled: !!projectId,
  })
}

export function useProjectPlan(id: string | undefined) {
  return useQuery({
    queryKey: ['project-plan', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ProjectPlan>>(`/project-plans/${id}`)
      return data.data
    },
    enabled: !!id,
  })
}

export function usePlanNotifications() {
  return useQuery({
    queryKey: ['plan-notifications'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PlanNotification[]>>(
        '/project-plans/notifications',
      )
      return data.data
    },
  })
}

interface CreatePlanPayload {
  project_id: string
  title: string
  description?: string
  planned_start?: string
  planned_end?: string
  total_budget?: number
  plan_data?: Record<string, unknown>
  attachments?: string[]
}

export function useCreatePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreatePlanPayload) => {
      const { data } = await api.post<ApiResponse<ProjectPlan>>('/project-plans', payload)
      return data.data
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['project-plans'] }),
  })
}

function usePlanAction(endpoint: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment?: string }) => {
      const { data } = await api.patch<ApiResponse<ProjectPlan>>(
        `/project-plans/${id}/${endpoint}`,
        { comment },
      )
      return data.data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project-plans'] })
      void qc.invalidateQueries({ queryKey: ['project-plan'] })
      void qc.invalidateQueries({ queryKey: ['plan-notifications'] })
    },
  })
}

export function useSubmitPlan() {
  return usePlanAction('submit')
}
export function useReviewPlan() {
  return usePlanAction('review')
}
export function useApprovePlan() {
  return usePlanAction('approve')
}
export function useRejectPlan() {
  return usePlanAction('reject')
}
