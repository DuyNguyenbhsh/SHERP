import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, ArrowLeft, CheckCircle2, Mail } from 'lucide-react'
import { isAxiosError } from 'axios'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/shared/api/axios'

const schema = z.object({
  username: z.string().min(1, 'Vui lòng nhập email hoặc tên đăng nhập'),
})

type FormValues = z.infer<typeof schema>

interface ForgotPasswordFormProps {
  onBack: () => void
}

export function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps): React.JSX.Element {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: '' },
  })

  const onSubmit = (values: FormValues): void => {
    setLoading(true)
    setError(null)

    api
      .post('/auth/forgot-password', { username: values.username })
      .then(() => {
        setSent(true)
      })
      .catch((err: unknown) => {
        if (isAxiosError(err)) {
          setError(err.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.')
        } else {
          setError('Lỗi kết nối. Vui lòng thử lại.')
        }
      })
      .finally(() => {
        setLoading(false)
      })
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
        <h3 className="text-lg font-semibold">Đã gửi yêu cầu</h3>
        <p className="text-sm text-muted-foreground">
          Nếu tài khoản tồn tại trong hệ thống, bạn sẽ nhận được email hướng dẫn đặt lại mật khẩu.
          Vui lòng kiểm tra hộp thư (bao gồm thư mục Spam).
        </p>
        <p className="text-xs text-muted-foreground">Link có hiệu lực trong 30 phút.</p>
        <Button variant="outline" onClick={onBack} className="w-full">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại Đăng nhập
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <Mail className="mx-auto mb-2 h-10 w-10 text-primary" />
        <h3 className="text-lg font-semibold">Quên mật khẩu?</h3>
        <p className="text-sm text-muted-foreground">
          Nhập email hoặc tên đăng nhập. Hệ thống sẽ gửi link đặt lại mật khẩu.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="forgot-username">Email / Tài khoản</Label>
          <Input
            id="forgot-username"
            placeholder="Nhập email hoặc tên đăng nhập"
            autoComplete="username"
            disabled={loading}
            {...register('username')}
          />
          {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? 'Đang gửi...' : 'Gửi yêu cầu'}
        </Button>
      </form>

      <Button variant="ghost" onClick={onBack} className="w-full text-muted-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Quay lại Đăng nhập
      </Button>
    </div>
  )
}
