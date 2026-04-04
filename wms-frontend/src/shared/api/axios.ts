import axios, { type AxiosError } from 'axios'
import { toast } from 'sonner'
import { useAuthStore } from '@/features/auth/model/auth.store'

/**
 * Base URL: dùng /api (relative) → Vite proxy forward tới backend.
 * Development: Vite proxy /api → http://localhost:3000/api
 * Production: Cùng origin (ServeStatic) → /api trực tiếp
 */
const baseURL: string = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api'

console.log('[Axios] baseURL =', baseURL)
console.log('[Axios] VITE_API_URL =', import.meta.env.VITE_API_URL)

const api = axios.create({
  baseURL,
  timeout: 15000, // 15s timeout — tránh treo vô hạn khi server không phản hồi
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Request Interceptor: Gắn JWT token ──
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response Interceptor: Xử lý lỗi tập trung ──
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; status?: string | boolean }>) => {
    const status = error.response?.status
    const serverMessage = error.response?.data?.message

    // ══ DEBUG: Log mọi lỗi API ra console để dễ debug ══
    console.error('[API Error]', {
      url: error.config?.url,
      method: error.config?.method,
      status,
      code: error.code,
      serverMessage,
      responseData: error.response?.data,
      message: error.message,
    })

    // ── 1. Network Error (không kết nối được server) ──
    if (!error.response) {
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        toast.error('Máy chủ không phản hồi (timeout). Vui lòng thử lại hoặc liên hệ IT.', {
          duration: 6000,
        })
      } else if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        toast.error('Không thể kết nối tới máy chủ. Vui lòng kiểm tra mạng hoặc liên hệ IT.', {
          duration: 8000,
        })
      } else {
        toast.error('Lỗi kết nối không xác định. Vui lòng kiểm tra mạng hoặc liên hệ IT.', {
          duration: 6000,
        })
      }
      return Promise.reject(error as Error)
    }

    // ── 2. Lỗi xác thực ──
    if (status === 401) {
      const isLoginRequest = error.config?.url?.includes('/auth/login')
      if (!isLoginRequest) {
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
        useAuthStore.getState().logout()
        window.location.replace('/login')
      }
    }
    // ── 3. Không có quyền ──
    else if (status === 403) {
      toast.error(serverMessage || 'Bạn không có quyền thực hiện thao tác này.')
    }
    // ── 4. Lỗi nghiệp vụ (409, 400): Để component onError xử lý qua getErrorMessage() ──
    // Không auto-toast → tránh double-toast với useMutation.onError
    else if (status === 409 || status === 400) {
      // Intentionally no toast here
    }
    // ── 5. Lỗi server ──
    else if (status && status >= 500) {
      toast.error(serverMessage || 'Hệ thống đang bận, vui lòng thử lại sau.')
    }

    return Promise.reject(error as Error)
  },
)

/**
 * Helper: Trích xuất message lỗi từ AxiosError.
 * Dùng trong onError callback của useMutation.
 *
 * Ưu tiên: server message > error.message > fallback.
 * Nếu là Network Error → trả message cụ thể thay vì fallback chung.
 */
export function getErrorMessage(err: unknown, fallback = 'Đã xảy ra lỗi'): string {
  if (axios.isAxiosError<{ message?: string }>(err)) {
    // Server trả về response → lấy message từ data
    if (err.response?.data?.message) {
      return err.response.data.message
    }
    // Network error / timeout → message cụ thể
    if (err.code === 'ECONNABORTED') {
      return 'Máy chủ không phản hồi (timeout). Vui lòng thử lại.'
    }
    if (err.code === 'ERR_NETWORK' || !err.response) {
      return 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra mạng hoặc liên hệ IT.'
    }
    return fallback
  }
  if (err instanceof Error) return err.message
  return fallback
}

export { api }
