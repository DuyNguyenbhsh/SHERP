import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { WorkItem, WorkItemFeedFilter } from '../types'

interface ApiResponse<T> {
  status?: string | boolean
  message?: string
  data: T
}

export function useWorkItemFeed(filter: WorkItemFeedFilter = {}) {
  return useQuery({
    queryKey: ['work-items', 'feed', filter],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (filter.types?.length) params.types = filter.types.join(',')
      if (filter.statuses?.length) params.statuses = filter.statuses.join(',')
      if (filter.onlyMine !== undefined) params.onlyMine = String(filter.onlyMine)
      if (filter.from) params.from = filter.from
      if (filter.to) params.to = filter.to
      if (filter.limit) params.limit = String(filter.limit)
      const { data } = await api.get<ApiResponse<WorkItem[]>>('/work-items/feed', { params })
      return data.data
    },
  })
}

export function useWorkItem(id: string | null) {
  return useQuery({
    queryKey: ['work-items', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<WorkItem>>(`/work-items/${id!}`)
      return data.data
    },
    enabled: Boolean(id),
  })
}

export function useReassignWorkItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: { id: string; assigneeId: string; reason?: string }) => {
      const { data } = await api.post<ApiResponse<WorkItem>>(`/work-items/${args.id}/reassign`, {
        assigneeId: args.assigneeId,
        reason: args.reason,
      })
      return data.data
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['work-items'] }),
  })
}
