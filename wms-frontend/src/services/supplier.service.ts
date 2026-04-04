import axios from 'axios'

const API_URL = 'http://localhost:3000/suppliers'

// ── Supplier entity returned by the API ──
export interface Supplier {
  id: string
  supplier_code: string
  name: string
  short_name: string | null
  contact_person: string | null
  email: string | null
  phone: string | null
  address: string | null
  tax_code: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// ── DTO for create / update ──
export interface CreateSupplierDto {
  supplier_code: string
  name: string
  short_name?: string
  contact_person?: string
  email?: string
  phone?: string
  address?: string
  tax_code?: string
  is_active?: boolean
}

export type UpdateSupplierDto = Partial<CreateSupplierDto>

// ── Generic API envelope used by the backend ──
interface ApiResponse<T> {
  status: string
  data: T
}

export const SupplierService = {
  // Lay danh sach, co ho tro co showInactive
  getAll: async (showInactive: boolean = false): Promise<Supplier[]> => {
    const response = await axios.get<ApiResponse<Supplier[]>>(
      `${API_URL}?showInactive=${showInactive}`,
    )
    return response.data.data
  },

  getById: async (id: string): Promise<Supplier> => {
    const response = await axios.get<ApiResponse<Supplier>>(`${API_URL}/${id}`)
    return response.data.data
  },

  create: async (data: CreateSupplierDto): Promise<Supplier> => {
    const response = await axios.post<ApiResponse<Supplier>>(API_URL, data)
    return response.data.data
  },

  update: async (id: string, data: UpdateSupplierDto): Promise<Supplier> => {
    const response = await axios.put<ApiResponse<Supplier>>(`${API_URL}/${id}`, data)
    return response.data.data
  },

  // API "Khoi phuc" dang cap ERP
  restore: async (id: string): Promise<Supplier> => {
    const response = await axios.put<ApiResponse<Supplier>>(`${API_URL}/${id}/restore`)
    return response.data.data
  },

  // API Xoa mem
  delete: async (id: string): Promise<void> => {
    await axios.delete(`${API_URL}/${id}`)
  },
}
