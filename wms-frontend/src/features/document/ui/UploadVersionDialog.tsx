import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useUploadVersion } from '@/entities/document'

interface UploadVersionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentId: string
  documentName: string
}

const MAX_SIZE = 50 * 1024 * 1024

export function UploadVersionDialog({
  open,
  onOpenChange,
  documentId,
  documentName,
}: UploadVersionDialogProps): React.JSX.Element {
  const [file, setFile] = useState<File | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const uploadMut = useUploadVersion()

  const handleFile = (f: File | null): void => {
    if (!f) return setFile(null)
    if (f.size > MAX_SIZE) {
      setError('File vượt quá 50MB')
      setFile(null)
      return
    }
    setError(null)
    setFile(f)
  }

  const handleSubmit = (): void => {
    if (!file) return setError('Chưa chọn file')
    if (note.trim().length < 10) return setError('Ghi chú tối thiểu 10 ký tự')
    setError(null)
    uploadMut.mutate(
      { documentId, file, change_note: note.trim() },
      {
        onSuccess: (v) => {
          toast.success(`Tải lên phiên bản ${v.version_number} thành công`)
          setFile(null)
          setNote('')
          if (fileRef.current) fileRef.current.value = ''
          onOpenChange(false)
        },
        onError: (e: unknown) => {
          const err = e as { response?: { data?: { message?: string } } }
          toast.error(err.response?.data?.message ?? 'Tải lên thất bại')
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload phiên bản mới</DialogTitle>
          <DialogDescription>
            Tài liệu: <strong>{documentName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="file">Chọn file (tối đa 50MB) *</Label>
            <Input
              id="file"
              type="file"
              ref={fileRef}
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            {file && (
              <p className="text-xs text-muted-foreground">
                {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note">Ghi chú thay đổi (tối thiểu 10 ký tự) *</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Cập nhật BOQ theo yêu cầu CĐT ngày 14/04/2026"
              rows={3}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={uploadMut.isPending}>
            {uploadMut.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Tải lên
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
