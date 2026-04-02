import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { ApprovalConfig, ApprovalRequest, ApprovalStep } from '../../project/types'

interface ApiResponse<T> {
  status: string
  message: string
  data: T
}

// ── Config CRUD ──

export function useApprovalConfigs() {
  return useQuery({
    queryKey: ['approvals', 'configs'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ApprovalConfig[]>>('/approvals/configs')
      return data.data
    },
  })
}

export function useCreateApprovalConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (
      payload: Partial<ApprovalConfig> & { steps: Partial<ApprovalConfig['steps'][number]>[] },
    ) => {
      const { data } = await api.post<ApiResponse<ApprovalConfig>>('/approvals/configs', payload)
      return data.data
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['approvals', 'configs'] }),
  })
}

export function useUpdateApprovalConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Partial<ApprovalConfig>) => {
      const { data } = await api.put<ApiResponse<ApprovalConfig>>(
        `/approvals/configs/${id}`,
        payload,
      )
      return data.data
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['approvals', 'configs'] }),
  })
}

export function useToggleApprovalConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch<ApiResponse<ApprovalConfig>>(
        `/approvals/configs/${id}/toggle`,
      )
      return data.data
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['approvals', 'configs'] }),
  })
}

export function useDeleteApprovalConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/approvals/configs/${id}`)
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['approvals', 'configs'] }),
  })
}

// ── Approval Processing ──

export function useMyPendingApprovals() {
  return useQuery({
    queryKey: ['approvals', 'pending'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ApprovalStep[]>>('/approvals/pending')
      return data.data
    },
  })
}

export function useApprovalsByEntity(entityType: string, entityId: string | undefined) {
  return useQuery({
    queryKey: ['approvals', 'by-entity', entityType, entityId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ApprovalRequest[]>>('/approvals/by-entity', {
        params: { entity_type: entityType, entity_id: entityId },
      })
      return data.data
    },
    enabled: !!entityId,
  })
}

export function useSubmitForApproval() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      entity_type: string
      entity_id: string
      amount?: number
      request_data?: Record<string, unknown>
    }) => {
      const { data } = await api.post<ApiResponse<ApprovalRequest>>('/approvals/submit', payload)
      return data.data
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['approvals'] }),
  })
}

export function useApproveStep() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { step_id: string; comment?: string }) => {
      const { data } = await api.patch<ApiResponse<ApprovalRequest>>(
        `/approvals/steps/${payload.step_id}/approve`,
        { comment: payload.comment },
      )
      return data.data
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['approvals'] }),
  })
}

export function useRejectStep() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { step_id: string; comment?: string }) => {
      const { data } = await api.patch<ApiResponse<ApprovalRequest>>(
        `/approvals/steps/${payload.step_id}/reject`,
        { comment: payload.comment },
      )
      return data.data
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['approvals'] }),
  })
}
