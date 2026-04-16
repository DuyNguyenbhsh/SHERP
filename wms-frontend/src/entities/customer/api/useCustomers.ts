import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { Customer, CreateCustomerPayload, UpdateCustomerPayload, CustomerDebt } from '../types'

interface ApiResponse<T> {
  status?: string | boolean
  message?: string
  data: T
}

async function fetchCustomers(filter: {
  is_active?: boolean
  customer_type?: string
}): Promise<Customer[]> {
  const params: Record<string, string> = {}
  if (filter.is_active !== undefined) params.is_active = String(filter.is_active)
  if (filter.customer_type) params.customer_type = filter.customer_type
  const { data } = await api.get<ApiResponse<Customer[]>>('/customers', {
    params,
  })
  return data.data
}

export function useCustomers(filter: { is_active?: boolean; customer_type?: string } = {}) {
  return useQuery({
    queryKey: ['customers', filter],
    queryFn: () => fetchCustomers(filter),
  })
}

async function fetchCustomerDebt(id: string): Promise<CustomerDebt> {
  const { data } = await api.get<ApiResponse<CustomerDebt>>(`/customers/${id}/debt`)
  return data.data
}

export function useCustomerDebt(id: string | null) {
  return useQuery({
    queryKey: ['customers', id, 'debt'],
    queryFn: () => fetchCustomerDebt(id!),
    enabled: Boolean(id),
  })
}

async function createCustomer(payload: CreateCustomerPayload): Promise<Customer> {
  const { data } = await api.post<ApiResponse<Customer>>('/customers', payload)
  return data.data
}

export function useCreateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createCustomer,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['customers'] }),
  })
}

async function updateCustomer(args: {
  id: string
  data: UpdateCustomerPayload
}): Promise<Customer> {
  const { data } = await api.patch<ApiResponse<Customer>>(`/customers/${args.id}`, args.data)
  return data.data
}

export function useUpdateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateCustomer,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['customers'] }),
  })
}

async function deleteCustomer(id: string): Promise<void> {
  await api.delete(`/customers/${id}`)
}

export function useDeleteCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['customers'] }),
  })
}

async function restoreCustomer(id: string): Promise<void> {
  await api.put(`/customers/${id}/restore`)
}

export function useRestoreCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: restoreCustomer,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['customers'] }),
  })
}
