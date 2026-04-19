import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { OfficeTask, CreateOfficeTaskPayload } from '../types'

interface ApiResponse<T> {
  status?: string | boolean
  message?: string
  data: T
}

export function useOfficeTasks(
  filter: {
    projectId?: string
    assigneeId?: string
    status?: string
  } = {},
) {
  return useQuery({
    queryKey: ['office-tasks', filter],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (filter.projectId) params.projectId = filter.projectId
      if (filter.assigneeId) params.assigneeId = filter.assigneeId
      if (filter.status) params.status = filter.status
      const { data } = await api.get<ApiResponse<OfficeTask[]>>('/office-tasks', { params })
      return data.data
    },
  })
}

export function useOfficeTask(id: string | null) {
  return useQuery({
    queryKey: ['office-tasks', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<OfficeTask>>(`/office-tasks/${id!}`)
      return data.data
    },
    enabled: Boolean(id),
  })
}

export function useCreateOfficeTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateOfficeTaskPayload) => {
      const { data } = await api.post<ApiResponse<OfficeTask>>('/office-tasks', payload)
      return data.data
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['office-tasks'] }),
  })
}

export function useToggleOfficeTaskItem(taskId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: { itemId: string; is_done: boolean }) => {
      const { data } = await api.patch<ApiResponse<unknown>>(
        `/office-tasks/${taskId}/items/${args.itemId}/toggle`,
        { is_done: args.is_done },
      )
      return data.data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['office-tasks', taskId] })
      void qc.invalidateQueries({ queryKey: ['work-items'] })
    },
  })
}

export function useCompleteOfficeTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<ApiResponse<OfficeTask>>(`/office-tasks/${id}/complete`)
      return data.data
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['office-tasks'] }),
  })
}
