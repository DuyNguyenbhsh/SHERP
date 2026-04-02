import axios from 'axios'

const API_URL = 'http://localhost:3000/suppliers'

export const SupplierService = {
  // Lấy danh sách, có hỗ trợ cờ showInactive
  getAll: async (showInactive: boolean = false) => {
    const response = await axios.get(`${API_URL}?showInactive=${showInactive}`)
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

  // API "Khôi phục" đẳng cấp ERP
  restore: async (id: string) => {
    const response = await axios.put(`${API_URL}/${id}/restore`)
    return response.data
  },

  // API Xóa mềm
  delete: async (id: string) => {
    const response = await axios.delete(`${API_URL}/${id}`)
    return response.data
  },
}
