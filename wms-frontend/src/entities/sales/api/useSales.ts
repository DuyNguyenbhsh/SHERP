import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type {
  SalesQuote,
  SalesOrder,
  CreateQuotePayload,
  CreateSalesOrderPayload,
  SalesKpi,
} from '../types'

interface ApiResponse<T> {
  status?: string | boolean
  message?: string
  data: T
}

// ── Quotes ──

async function fetchQuotes(filter: {
  status?: string
  customer_id?: string
}): Promise<SalesQuote[]> {
  const { data } = await api.get<ApiResponse<SalesQuote[]>>('/sales/quotes', {
    params: filter,
  })
  return data.data
}

export function useQuotes(filter: Parameters<typeof fetchQuotes>[0] = {}) {
  return useQuery({
    queryKey: ['sales', 'quotes', filter],
    queryFn: () => fetchQuotes(filter),
  })
}

async function createQuote(payload: CreateQuotePayload): Promise<SalesQuote> {
  const { data } = await api.post<ApiResponse<SalesQuote>>('/sales/quotes', payload)
  return data.data
}

export function useCreateQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createQuote,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['sales', 'quotes'] }),
  })
}

async function transitionQuote(args: {
  id: string
  action: 'send' | 'accept' | 'reject'
}): Promise<SalesQuote> {
  const { data } = await api.post<ApiResponse<SalesQuote>>(
    `/sales/quotes/${args.id}/${args.action}`,
  )
  return data.data
}

export function useTransitionQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: transitionQuote,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['sales', 'quotes'] }),
  })
}

async function deleteQuote(id: string): Promise<void> {
  await api.delete(`/sales/quotes/${id}`)
}

export function useDeleteQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteQuote,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['sales', 'quotes'] }),
  })
}

// ── Sales Orders ──

async function fetchOrders(filter: {
  status?: string
  customer_id?: string
}): Promise<SalesOrder[]> {
  const { data } = await api.get<ApiResponse<SalesOrder[]>>('/sales/orders', {
    params: filter,
  })
  return data.data
}

export function useSalesOrders(filter: Parameters<typeof fetchOrders>[0] = {}) {
  return useQuery({
    queryKey: ['sales', 'orders', filter],
    queryFn: () => fetchOrders(filter),
  })
}

async function createOrder(payload: CreateSalesOrderPayload): Promise<SalesOrder> {
  const { data } = await api.post<ApiResponse<SalesOrder>>('/sales/orders', payload)
  return data.data
}

export function useCreateSalesOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sales', 'orders'] })
      void qc.invalidateQueries({ queryKey: ['sales', 'quotes'] })
      void qc.invalidateQueries({ queryKey: ['customers'] })
      void qc.invalidateQueries({ queryKey: ['outbound'] })
    },
  })
}

async function cancelOrder(args: { id: string; reason: string }): Promise<SalesOrder> {
  const { data } = await api.patch<ApiResponse<SalesOrder>>(`/sales/orders/${args.id}/cancel`, {
    reason: args.reason,
  })
  return data.data
}

export function useCancelSalesOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: cancelOrder,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sales', 'orders'] })
      void qc.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

async function fetchKpi(from?: string, to?: string): Promise<SalesKpi> {
  const { data } = await api.get<ApiResponse<SalesKpi>>('/sales/kpi', {
    params: { from, to },
  })
  return data.data
}

export function useSalesKpi(from?: string, to?: string) {
  return useQuery({
    queryKey: ['sales', 'kpi', { from, to }],
    queryFn: () => fetchKpi(from, to),
  })
}
