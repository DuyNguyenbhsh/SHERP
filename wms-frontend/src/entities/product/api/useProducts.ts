import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { Product, CreateProductPayload, UpdateProductPayload } from '../types'

interface ApiResponse<T> {
  status: boolean
  message: string
  data: T
}

async function fetchProducts(showInactive = false): Promise<Product[]> {
  const { data } = await api.get<ApiResponse<Product[]>>('/products', {
    params: showInactive ? { showInactive: 'true' } : undefined,
  })
  return data.data
}

export function useProducts(showInactive = false) {
  return useQuery({
    queryKey: ['products', { showInactive }],
    queryFn: () => fetchProducts(showInactive),
  })
}

async function createProduct(payload: CreateProductPayload): Promise<Product> {
  const { data } = await api.post<ApiResponse<Product>>('/products', payload)
  return data.data
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

async function updateProduct(args: { id: string; data: UpdateProductPayload }): Promise<Product> {
  const { data } = await api.put<ApiResponse<Product>>(`/products/${args.id}`, args.data)
  return data.data
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateProduct,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

async function deleteProduct(id: string): Promise<void> {
  await api.delete(`/products/${id}`)
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

async function restoreProduct(id: string): Promise<void> {
  await api.put(`/products/${id}/restore`)
}

export function useRestoreProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: restoreProduct,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['products'] }),
  })
}
