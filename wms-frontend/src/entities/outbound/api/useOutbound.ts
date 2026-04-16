import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { OutboundOrder, CreateOutboundOrderPayload, OutboundStatus } from '../types'

interface ApiResponse<T> {
  status: string | boolean
  message: string
  data: T
}

async function fetchOutbound(status?: string): Promise<OutboundOrder[]> {
  const { data } = await api.get<ApiResponse<OutboundOrder[]>>('/outbound', {
    params: status ? { status } : undefined,
  })
  return data.data
}

export function useOutboundOrders(status?: string) {
  return useQuery({
    queryKey: ['outbound', { status }],
    queryFn: () => fetchOutbound(status),
  })
}

async function createOutbound(payload: CreateOutboundOrderPayload): Promise<OutboundOrder> {
  const { data } = await api.post<ApiResponse<OutboundOrder>>('/outbound', payload)
  return data.data
}

export function useCreateOutbound() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createOutbound,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['outbound'] }),
  })
}

async function updateOutboundStatus(args: {
  id: string
  status: OutboundStatus
}): Promise<OutboundOrder> {
  const { data } = await api.patch<ApiResponse<OutboundOrder>>(`/outbound/${args.id}/status`, {
    status: args.status,
  })
  return data.data
}

export function useUpdateOutboundStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateOutboundStatus,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['outbound'] }),
  })
}
