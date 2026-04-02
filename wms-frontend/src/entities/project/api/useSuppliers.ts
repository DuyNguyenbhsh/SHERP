import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'

interface Supplier {
  id: string
  supplier_code: string
  name: string
  short_name: string | null
}

async function fetchSuppliers(): Promise<Supplier[]> {
  const { data } = await api.get<{ status: string; data: Supplier[] }>('/suppliers')
  return data.data
}

export function useSuppliers() {
  return useQuery({ queryKey: ['suppliers'], queryFn: fetchSuppliers })
}
