import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, AlertTriangle, Lock } from 'lucide-react'
import { isAxiosError } from 'axios'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { useAuthStore } from '@/features/auth/model/auth.store'
import { loginRequest } from '@/features/auth/api/auth.api'
import { ForgotPasswordForm } from './ForgotPasswordForm'
import { ContactITModal } from './ContactITModal'
import { APP_COPYRIGHT } from '@/shared/constants/app'
import shLogo from '@/assets/sh-visionary-logo.jpg'

const loginSchema = z.object({
  username: z.string().min(1, 'Vui lòng nhập tài khoản'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
})

type LoginFormValues = z.infer<typeof loginSchema>

interface LoginError {
  message: string
  type: 'credentials' | 'locked' | 'network' | 'server'
}

type PageView = 'login' | 'forgot-password'

export function LoginPage(): React.JSX.Element {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [loading, setLoading] = useState(false)
  const [loginError, setLoginError] = useState<LoginError | null>(null)
  const [view, setView] = useState<PageView>('login')
  const [contactOpen, setContactOpen] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })

  const onSubmit = (values: LoginFormValues): void => {
    setLoading(true)
    setLoginError(null)

    loginRequest(values)
      .then((data) => {
        setAuth(data.user, data.access_token)
        toast.success(`Chào mừng ${data.user.username}!`)
        void navigate('/', { replace: true })
      })
      .catch((err: unknown) => {
        if (isAxiosError(err)) {
          const status = err.response?.status
          const data = err.response?.data as Record<string, unknown> | undefined
          const nestedData = data?.data as Record<string, unknown> | undefined
          const serverMsg =
            typeof nestedData?.message === 'string'
              ? nestedData.message
              : typeof data?.message === 'string'
                ? data.message
                : ''

          if (status === 401) {
            const isLocked = serverMsg.includes('tạm khoá') || serverMsg.includes('bị khoá')
            setLoginError({
              message: serverMsg || 'Sai tài khoản hoặc mật khẩu',
              type: isLocked ? 'locked' : 'credentials',
            })
          } else if (!err.response) {
            setLoginError({
              message: 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra mạng.',
              type: 'network',
            })
          } else {
            setLoginError({
              message: serverMsg || 'Lỗi hệ thống. Vui lòng thử lại.',
              type: 'server',
            })
          }
        } else {
          setLoginError({
            message: 'Lỗi không xác định. Vui lòng thử lại.',
            type: 'network',
          })
        }
      })
      .finally(() => {
        setLoading(false)
      })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center">
          <div className="-mx-6 -mt-6 mb-4 rounded-t-lg border-b-2 border-brand-accent/30 bg-brand-accent/5 px-6 pt-6 pb-4">
            <img src={shLogo} alt="SH Visionary" className="mx-auto h-16 object-contain" />
          </div>
          <CardTitle className="text-2xl text-primary">SH ERP</CardTitle>
          <CardDescription>Hệ thống Quản trị Doanh nghiệp Tổng thể</CardDescription>
        </CardHeader>
        <CardContent>
          {view === 'forgot-password' ? (
            <ForgotPasswordForm onBack={() => setView('login')} />
          ) : (
            <>
              {/* Error Banner */}
              {loginError && (
                <div
                  className={`mb-4 flex items-start gap-2 rounded-lg border p-3 text-sm ${
                    loginError.type === 'locked'
                      ? 'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-200'
                      : loginError.type === 'credentials'
                        ? 'border-destructive/30 bg-destructive/10 text-destructive'
                        : 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200'
                  }`}
                >
                  {loginError.type === 'locked' ? (
                    <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <span>{loginError.message}</span>
                </div>
              )}

              <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Tài khoản</Label>
                  <Input
                    id="username"
                    placeholder="Nhập tài khoản"
                    autoComplete="username"
                    disabled={loading}
                    {...register('username')}
                  />
                  {errors.username && (
                    <p className="text-sm text-destructive">{errors.username.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Mật khẩu</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Nhập mật khẩu"
                    autoComplete="current-password"
                    disabled={loading}
                    {...register('password')}
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? 'Đang xác thực...' : 'Đăng nhập'}
                </Button>
              </form>

              {/* Links phụ trợ */}
              <div className="mt-4 flex items-center justify-between border-t pt-4">
                <button
                  type="button"
                  onClick={() => setView('forgot-password')}
                  className="text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                >
                  Quên mật khẩu?
                </button>
                <button
                  type="button"
                  onClick={() => setContactOpen(true)}
                  className="text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                >
                  Liên hệ IT
                </button>
              </div>
            </>
          )}

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-muted-foreground">{APP_COPYRIGHT}</p>
        </CardContent>
      </Card>

      {/* Contact IT Modal */}
      <ContactITModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  )
}
