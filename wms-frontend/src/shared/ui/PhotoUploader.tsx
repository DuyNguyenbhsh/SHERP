import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api, getErrorMessage } from '@/shared/api/axios'

interface CloudinaryResponse {
  status?: string | boolean
  data: {
    secure_url: string
    public_id?: string
    format?: string
    bytes?: number
  }
}

interface Props {
  value: string[]
  onChange: (urls: string[]) => void
  folder?: string
  max?: number
  maxSizeMb?: number
  accept?: string
  disabled?: boolean
  label?: string
}

const ACCEPTED_IMAGE = 'image/jpeg,image/png,image/webp,image/heic'

export function PhotoUploader({
  value,
  onChange,
  folder = 'master-plan',
  max = 10,
  maxSizeMb = 10,
  accept = ACCEPTED_IMAGE,
  disabled,
  label = 'Tải ảnh lên',
}: Props): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleFiles = async (files: FileList | null): Promise<void> => {
    if (!files || files.length === 0) return
    if (value.length + files.length > max) {
      toast.error(`Tối đa ${max} ảnh / lần đính kèm`)
      return
    }
    setUploading(true)
    try {
      const newUrls: string[] = []
      for (const f of Array.from(files)) {
        if (f.size > maxSizeMb * 1024 * 1024) {
          toast.error(`File "${f.name}" vượt ${maxSizeMb} MB`)
          continue
        }
        const fd = new FormData()
        fd.append('file', f)
        fd.append('folder', folder)
        const res = await api.post<CloudinaryResponse>('/upload/cloudinary', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        newUrls.push(res.data.data.secure_url)
      }
      if (newUrls.length) {
        onChange([...value, ...newUrls])
        toast.success(`Đã upload ${newUrls.length} ảnh`)
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Upload thất bại'))
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const remove = (url: string): void => {
    onChange(value.filter((v) => v !== url))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || uploading || value.length >= max}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          {label}
        </Button>
        <span className="text-xs text-muted-foreground">
          {value.length}/{max} ảnh · ≤ {maxSizeMb}MB/file
        </span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>

      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
          {value.map((url) => (
            <div key={url} className="relative aspect-square overflow-hidden rounded border">
              <img
                src={url}
                alt="evidence"
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 transition hover:bg-black/40 hover:opacity-100">
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="h-7 w-7"
                  onClick={() => remove(url)}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {value.length === 0 && (
        <div className="flex h-24 items-center justify-center rounded border border-dashed text-xs text-muted-foreground">
          <ImageIcon className="mr-2 h-4 w-4" />
          Chưa có ảnh
        </div>
      )}
    </div>
  )
}
