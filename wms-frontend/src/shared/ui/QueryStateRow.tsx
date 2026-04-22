import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { TableCell, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/shared/api/axios'

interface QueryStateRowProps {
  colSpan: number
  isLoading: boolean
  isError: boolean
  isEmpty: boolean
  error?: unknown
  onRetry?: () => void
  emptyText?: string
}

export function QueryStateRow({
  colSpan,
  isLoading,
  isError,
  isEmpty,
  error,
  onRetry,
  emptyText = 'Chưa có dữ liệu',
}: QueryStateRowProps): React.ReactElement | null {
  if (isLoading) {
    return (
      <TableRow>
        <TableCell colSpan={colSpan} className="text-center py-12">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        </TableCell>
      </TableRow>
    )
  }

  if (isError) {
    return (
      <TableRow>
        <TableCell colSpan={colSpan} className="py-12">
          <div className="flex flex-col items-center gap-3 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <div>
              <p className="font-medium text-foreground">Không tải được dữ liệu</p>
              <p className="text-sm text-muted-foreground mt-1">{getErrorMessage(error)}</p>
            </div>
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Thử lại
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
    )
  }

  if (isEmpty) {
    return (
      <TableRow>
        <TableCell colSpan={colSpan} className="text-center text-muted-foreground py-12">
          {emptyText}
        </TableCell>
      </TableRow>
    )
  }

  return null
}
