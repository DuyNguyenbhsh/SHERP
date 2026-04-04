import axios, { type AxiosError } from 'axios'

// CẤU HÌNH CỨNG LINK SERVER RENDER (Để đảm bảo 100% Mobile chạy được)
const RENDER_URL = 'https://sh-erp-backend.onrender.com'

const axiosClient = axios.create({
  baseURL: import.meta.env.PROD ? RENDER_URL : 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor: Tự động xử lý lỗi nếu API chết
axiosClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('API Error:', message, error)
    return Promise.reject(error)
  },
)

export default axiosClient
