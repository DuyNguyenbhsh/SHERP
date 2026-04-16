import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { Supplier, CreateSupplierPayload, UpdateSupplierPayload } from '../types'

interface ApiResponse<T> {
  status: boolean
  message: string
  data: T
}

async function fetchSuppliers(showInactive = false): Promise<Supplier[]> {
  const { data } = await api.get<ApiResponse<Supplier[]>>('/suppliers', {
    params: showInactive ? { showInactive: 'true' } : undefined,
  })
  return data.data
}

export function useSuppliers(showInactive = false) {
  return useQuery({
    queryKey: ['suppliers', { showInactive }],
    queryFn: () => fetchSuppliers(showInactive),
  })
}

async function createSupplier(payload: CreateSupplierPayload): Promise<Supplier> {
  const { data } = await api.post<ApiResponse<Supplier>>('/suppliers', payload)
  return data.data
}

export function useCreateSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createSupplier,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['suppliers'] }),
  })
}

async function updateSupplier(args: {
  id: string
  data: UpdateSupplierPayload
}): Promise<Supplier> {
  const { data } = await api.put<ApiResponse<Supplier>>(`/suppliers/${args.id}`, args.data)
  return data.data
}

export function useUpdateSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateSupplier,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['suppliers'] }),
  })
}

async function deleteSupplier(id: string): Promise<void> {
  await api.delete(`/suppliers/${id}`)
}

export function useDeleteSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['suppliers'] }),
  })
}

async function restoreSupplier(id: string): Promise<void> {
  await api.put(`/suppliers/${id}/restore`)
}

export function useRestoreSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: restoreSupplier,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['suppliers'] }),
  })
}
