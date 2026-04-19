import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { ChecklistInstance, ChecklistTemplate, SubmitItemResultPayload } from '../types'

interface ApiResponse<T> {
  status?: string | boolean
  message?: string
  data: T
}

export function useChecklistTemplates() {
  return useQuery({
    queryKey: ['checklists', 'templates'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ChecklistTemplate[]>>('/checklists/templates')
      return data.data
    },
  })
}

export function useChecklistInstance(id: string | null) {
  return useQuery({
    queryKey: ['checklists', 'instances', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ChecklistInstance>>(`/checklists/instances/${id!}`)
      return data.data
    },
    enabled: Boolean(id),
  })
}

export function useSubmitChecklistItem(instanceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: { itemId: string; payload: SubmitItemResultPayload }) => {
      const { data } = await api.post<ApiResponse<unknown>>(
        `/checklists/instances/${instanceId}/items/${args.itemId}/result`,
        args.payload,
      )
      return data.data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['checklists', 'instances', instanceId] })
      void qc.invalidateQueries({ queryKey: ['work-items'] })
    },
  })
}
