import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/features/auth/model/auth.store'

export function AuthGuard(): React.JSX.Element {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isValidating = useAuthStore((s) => s.isValidating)
  const validateToken = useAuthStore((s) => s.validateToken)

  // Khi mount (F5/refresh) → gọi /auth/me kiểm tra token còn hợp lệ
  useEffect(() => {
    void validateToken()
  }, [validateToken])

  // Đang validate → loading spinner (tránh flash redirect về /login)
  if (isValidating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Đang xác thực phiên đăng nhập...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
