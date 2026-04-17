import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-lg border border-red-200 bg-red-50/50 p-8">
          <AlertTriangle className="h-10 w-10 text-red-500" />
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-800">Đã xảy ra lỗi</h3>
            <p className="mt-1 text-sm text-red-600">
              {this.state.error?.message || 'Lỗi không xác định'}
            </p>
          </div>
          <Button variant="outline" onClick={this.handleReset}>
            Thử lại
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
