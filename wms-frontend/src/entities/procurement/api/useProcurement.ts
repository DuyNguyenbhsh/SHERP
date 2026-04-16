import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { PurchaseOrder, CreatePoPayload, ReceiveGoodsPayload } from '../types'

interface ApiResponse<T> {
  status?: string | boolean
  message: string
  data: T
}

async function fetchPOs(): Promise<PurchaseOrder[]> {
  const { data } = await api.get<ApiResponse<PurchaseOrder[]>>('/procurement/po')
  return data.data
}

export function usePurchaseOrders() {
  return useQuery({ queryKey: ['procurement', 'po'], queryFn: fetchPOs })
}

async function createPO(payload: CreatePoPayload): Promise<PurchaseOrder> {
  const { data } = await api.post<ApiResponse<PurchaseOrder>>('/procurement/po', payload)
  return data.data
}

export function useCreatePO() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createPO,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['procurement', 'po'] }),
  })
}

async function receiveGoods(payload: ReceiveGoodsPayload): Promise<unknown> {
  const { data } = await api.post<ApiResponse<unknown>>('/procurement/receive', payload)
  return data.data
}

export function useReceiveGoods() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: receiveGoods,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['procurement', 'po'] }),
  })
}
