import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { ProjectRequest } from '../types'

interface ApiResponse<T> {
  status: string
  message: string
  data: T
}

export function useProjectRequests(status?: string) {
  return useQuery({
    queryKey: ['project-requests', status],
    queryFn: async () => {
      const params = status ? { status } : undefined
      const { data } = await api.get<ApiResponse<ProjectRequest[]>>('/project-requests', { params })
      return data.data
    },
  })
}

export function useProjectRequest(id: string | undefined) {
  return useQuery({
    queryKey: ['project-request', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ProjectRequest>>(`/project-requests/${id}`)
      return data.data
    },
    enabled: !!id,
  })
}

interface CreatePayload {
  title: string
  description?: string
  proposed_project_code: string
  proposed_project_name: string
  location?: string
  gfa_m2?: number
  budget?: number
  investor_id?: string
  manager_id?: string
  department_id?: string
  proposed_stage?: string
}

export function useCreateProjectRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreatePayload) => {
      const { data } = await api.post<ApiResponse<ProjectRequest>>('/project-requests', payload)
      return data.data
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['project-requests'] }),
  })
}

function useWorkflowAction(endpoint: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment?: string }) => {
      const { data } = await api.patch<ApiResponse<ProjectRequest>>(
        `/project-requests/${id}/${endpoint}`,
        { comment },
      )
      return data.data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project-requests'] })
      void qc.invalidateQueries({ queryKey: ['project-request'] })
    },
  })
}

export function useSubmitRequest() {
  return useWorkflowAction('submit')
}
export function useApproveDept() {
  return useWorkflowAction('approve-dept')
}
export function useApproveExec() {
  return useWorkflowAction('approve-exec')
}
export function useRejectRequest() {
  return useWorkflowAction('reject')
}
export function useCancelRequest() {
  return useWorkflowAction('cancel')
}
