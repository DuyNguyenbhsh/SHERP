import axios from 'axios'

// Thay bằng URL Backend thực tế của anh (ví dụ: http://localhost:3000)
const API_URL = 'http://localhost:3000/products'

export const ProductService = {
  getAll: async () => {
    const response = await axios.get(API_URL)
    return response.data
  },

  getById: async (id: string) => {
    const response = await axios.get(`${API_URL}/${id}`)
    return response.data
  },

  create: async (data: any) => {
    const response = await axios.post(API_URL, data)
    return response.data
  },

  update: async (id: string, data: any) => {
    const response = await axios.put(`${API_URL}/${id}`, data)
    return response.data
  },

  delete: async (id: string) => {
    const response = await axios.delete(`${API_URL}/${id}`)
    return response.data
  },
}
