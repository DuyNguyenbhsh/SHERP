import axios from 'axios'

// Thay bằng URL Backend thực tế của anh (ví dụ: http://localhost:3000)
const API_URL = 'http://localhost:3000/products'

// ── Product entity returned by the API ──
export interface Product {
  id: string
  product_code: string
  name: string
  short_name: string | null
  unit: string
  unit_price: number
  category_id: string | null
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// ── DTO for create / update ──
export interface CreateProductDto {
  product_code: string
  name: string
  short_name?: string
  unit: string
  unit_price: number
  category_id?: string
  description?: string
  is_active?: boolean
}

export type UpdateProductDto = Partial<CreateProductDto>

// ── Generic API envelope used by the backend ──
interface ApiResponse<T> {
  status: string
  data: T
}

export const ProductService = {
  getAll: async (): Promise<Product[]> => {
    const response = await axios.get<ApiResponse<Product[]>>(API_URL)
    return response.data.data
  },

  getById: async (id: string): Promise<Product> => {
    const response = await axios.get<ApiResponse<Product>>(`${API_URL}/${id}`)
    return response.data.data
  },

  create: async (data: CreateProductDto): Promise<Product> => {
    const response = await axios.post<ApiResponse<Product>>(API_URL, data)
    return response.data.data
  },

  update: async (id: string, data: UpdateProductDto): Promise<Product> => {
    const response = await axios.put<ApiResponse<Product>>(`${API_URL}/${id}`, data)
    return response.data.data
  },

  delete: async (id: string): Promise<void> => {
    await axios.delete(`${API_URL}/${id}`)
  },
}
