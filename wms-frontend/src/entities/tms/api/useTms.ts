import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { Waybill, CreateWaybillPayload } from '../types'

interface ApiResponse<T> {
  status?: string | boolean
  message: string
  data: T
}

async function fetchWaybills(status?: string): Promise<Waybill[]> {
  const { data } = await api.get<ApiResponse<Waybill[]>>('/tms', {
    params: status ? { status } : undefined,
  })
  return data.data
}

export function useWaybills(status?: string) {
  return useQuery({
    queryKey: ['waybills', { status }],
    queryFn: () => fetchWaybills(status),
  })
}

async function fetchPendingOutbound(): Promise<
  { id: string; order_number: string; customer_name: string | null }[]
> {
  const { data } =
    await api.get<
      ApiResponse<{ id: string; order_number: string; customer_name: string | null }[]>
    >('/tms/pending-outbound')
  return data.data
}

export function usePendingOutbound() {
  return useQuery({
    queryKey: ['tms', 'pending-outbound'],
    queryFn: fetchPendingOutbound,
  })
}

async function createWaybill(payload: CreateWaybillPayload): Promise<Waybill> {
  const { data } = await api.post<ApiResponse<Waybill>>('/tms', payload)
  return data.data
}

export function useCreateWaybill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createWaybill,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['waybills'] })
      void qc.invalidateQueries({ queryKey: ['tms', 'pending-outbound'] })
    },
  })
}

async function completeDelivery(id: string): Promise<Waybill> {
  const { data } = await api.patch<ApiResponse<Waybill>>(`/tms/${id}/deliver`)
  return data.data
}

export function useCompleteDelivery() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: completeDelivery,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['waybills'] }),
  })
}
