import axios from 'axios'

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
  (error) => {
    console.error('API Error:', error)
    return Promise.reject(error)
  },
)

export default axiosClient
