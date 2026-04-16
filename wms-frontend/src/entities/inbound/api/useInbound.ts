import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { InboundReceipt, CreateInboundReceiptPayload, InboundStatus } from '../types'

interface ApiResponse<T> {
  status: string | boolean
  message: string
  data: T
}

async function fetchInbound(status?: string): Promise<InboundReceipt[]> {
  const { data } = await api.get<ApiResponse<InboundReceipt[]>>('/inbound', {
    params: status ? { status } : undefined,
  })
  return data.data
}

export function useInboundReceipts(status?: string) {
  return useQuery({
    queryKey: ['inbound', { status }],
    queryFn: () => fetchInbound(status),
  })
}

async function fetchInboundOne(id: string): Promise<InboundReceipt> {
  const { data } = await api.get<ApiResponse<InboundReceipt>>(`/inbound/${id}`)
  return data.data
}

export function useInboundReceipt(id: string | null) {
  return useQuery({
    queryKey: ['inbound', id],
    queryFn: () => fetchInboundOne(id!),
    enabled: Boolean(id),
  })
}

async function createInbound(payload: CreateInboundReceiptPayload): Promise<InboundReceipt> {
  const { data } = await api.post<ApiResponse<InboundReceipt>>('/inbound', payload)
  return data.data
}

export function useCreateInbound() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createInbound,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['inbound'] }),
  })
}

async function updateInboundStatus(args: {
  id: string
  status: InboundStatus
}): Promise<InboundReceipt> {
  const { data } = await api.patch<ApiResponse<InboundReceipt>>(`/inbound/${args.id}/status`, {
    status: args.status,
  })
  return data.data
}

export function useUpdateInboundStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateInboundStatus,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['inbound'] }),
  })
}
