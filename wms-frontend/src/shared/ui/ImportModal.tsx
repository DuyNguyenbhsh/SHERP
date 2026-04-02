import { useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { getErrorMessage, api } from '@/shared/api/axios'
import { Loader2, FileSpreadsheet, CheckCircle2, AlertCircle, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ImportError {
  row: number
  field: string
  message: string
}

interface ImportResult {
  total_rows: number
  success_rows: number
  error_rows: number
  errors?: ImportError[]
}

interface ImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  importUrl: string
  onSuccess?: () => void
}

type Phase = 'idle' | 'uploading' | 'done'

export function ImportModal({
  open,
  onOpenChange,
  title,
  description,
  importUrl,
  onSuccess,
}: ImportModalProps): React.JSX.Element {
  const fileRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const reset = () => {
    setPhase('idle')
    setProgress(0)
    setResult(null)
    setSelectedFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleClose = (o: boolean) => {
    if (phase === 'uploading') return
    if (!o) reset()
    onOpenChange(o)
  }

  const doImport = useCallback(
    async (file: File) => {
      if (!file.name.match(/\.xlsx?$/i)) {
        toast.error('Chỉ hỗ trợ file Excel (.xlsx, .xls)')
        return
      }

      setSelectedFile(file)
      setPhase('uploading')
      setProgress(10)

      const formData = new FormData()
      formData.append('file', file)

      try {
        setProgress(30)
        const { data } = await api.post<{ status: string; data: ImportResult }>(
          importUrl,
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (e) => {
              if (e.total) {
                setProgress(Math.min(30 + Math.round((e.loaded / e.total) * 50), 80))
              }
            },
          },
        )
        setProgress(100)
        setResult(data.data)
        setPhase('done')

        if (data.data.success_rows > 0) {
          toast.success(`Import thành công ${data.data.success_rows}/${data.data.total_rows} dòng`)
          onSuccess?.()
        }
        if (data.data.error_rows > 0) {
          toast.warning(`${data.data.error_rows} dòng lỗi`)
        }
      } catch (err: unknown) {
        toast.error(getErrorMessage(err, 'Import thất bại'))
        setPhase('idle')
        setProgress(0)
      }
    },
    [importUrl, onSuccess],
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void doImport(file)
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) void doImport(file)
    },
    [doImport],
  )

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleFileChange}
        />

        {phase === 'idle' && (
          <div
            className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
              dragOver ? 'border-blue-400 bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => fileRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            role="button"
            tabIndex={0}
          >
            <FileSpreadsheet
              className={`mx-auto h-10 w-10 mb-3 ${dragOver ? 'text-blue-500' : 'text-gray-400'}`}
            />
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-blue-600">Chọn file</span> hoặc kéo thả file Excel
              vào đây
            </p>
            <p className="text-xs text-muted-foreground mt-1">Hỗ trợ .xlsx, .xls</p>
          </div>
        )}

        {phase === 'uploading' && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">Đang import...</p>
                <p className="text-xs text-muted-foreground">{selectedFile?.name}</p>
              </div>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">{progress}%</p>
          </div>
        )}

        {phase === 'done' && result && (
          <div className="space-y-4 py-2">
            {/* Summary */}
            <div
              className={`rounded-lg border p-4 ${result.error_rows === 0 ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                {result.error_rows === 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                )}
                <span className="font-semibold text-sm">
                  {result.error_rows === 0 ? 'Import hoàn tất' : 'Import có lỗi'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-lg font-bold">{result.total_rows}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Tổng dòng</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-600">{result.success_rows}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Thành công</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-red-600">{result.error_rows}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Thất bại</p>
                </div>
              </div>
            </div>

            {/* Error details */}
            {result.errors && result.errors.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  Chi tiết lỗi
                </p>
                <div className="max-h-[200px] overflow-y-auto rounded border divide-y text-xs">
                  {result.errors.map((err, idx) => (
                    <div key={idx} className="px-3 py-2 flex items-start gap-2">
                      <X className="h-3 w-3 text-red-500 mt-0.5 shrink-0" />
                      <div>
                        {err.row > 0 && (
                          <span className="text-muted-foreground">Dòng {err.row}: </span>
                        )}
                        <span className="font-medium">{err.field}</span> — {err.message}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={reset}>
                Import thêm
              </Button>
              <Button size="sm" onClick={() => handleClose(false)}>
                Đóng
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
