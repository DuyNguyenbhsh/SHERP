import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type {
  InventoryItem,
  Location,
  AdjustInventoryPayload,
  TransferInventoryPayload,
} from '../types'

interface ApiResponse<T> {
  status: string | boolean
  message: string
  data: T
}

async function fetchInventory(filters: {
  product_id?: string
  location_id?: string
  warehouse_code?: string
  status?: string
}): Promise<InventoryItem[]> {
  const { data } = await api.get<ApiResponse<InventoryItem[]>>('/inventory/stock', {
    params: filters,
  })
  return data.data
}

export function useInventory(filters: Parameters<typeof fetchInventory>[0] = {}) {
  return useQuery({
    queryKey: ['inventory', filters],
    queryFn: () => fetchInventory(filters),
  })
}

async function fetchLocations(warehouse_code?: string): Promise<Location[]> {
  const { data } = await api.get<ApiResponse<Location[]>>('/inventory/locations', {
    params: warehouse_code ? { warehouse_code } : undefined,
  })
  return data.data
}

export function useLocations(warehouse_code?: string) {
  return useQuery({
    queryKey: ['locations', { warehouse_code }],
    queryFn: () => fetchLocations(warehouse_code),
  })
}

async function adjustInventory(payload: AdjustInventoryPayload): Promise<InventoryItem> {
  const { data } = await api.post<ApiResponse<InventoryItem>>('/inventory/stock/adjust', payload)
  return data.data
}

export function useAdjustInventory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: adjustInventory,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['inventory'] }),
  })
}

async function transferInventory(payload: TransferInventoryPayload): Promise<unknown> {
  const { data } = await api.post<ApiResponse<unknown>>('/inventory/stock/transfer', payload)
  return data.data
}

export function useTransferInventory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: transferInventory,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['inventory'] }),
  })
}
