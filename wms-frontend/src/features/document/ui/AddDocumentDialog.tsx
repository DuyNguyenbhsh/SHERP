import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useCreateDocument } from '@/entities/document'
import { api } from '@/shared/api/axios'

const MAX_FILE_SIZE = 50 * 1024 * 1024

const formSchema = z.object({
  document_name: z.string().min(1, 'Tên tài liệu không được để trống').max(255),
  file_url: z.string().max(1000).optional(),
  expiry_date: z.string().optional(),
  notes: z.string().max(1000).optional(),
})

type FormValues = z.infer<typeof formSchema>

interface AddDocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  folderId: string
  folderName: string
}

interface CloudinaryResponse {
  data: {
    secure_url: string
  }
}

export function AddDocumentDialog({
  open,
  onOpenChange,
  projectId,
  folderId,
  folderName,
}: AddDocumentDialogProps) {
  const createMutation = useCreateDocument()
  const [submitting, setSubmitting] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { document_name: '', file_url: '', expiry_date: '', notes: '' },
  })

  const handleFileChange = (f: File | null): void => {
    if (!f) {
      setFile(null)
      setFileError(null)
      return
    }
    if (f.size > MAX_FILE_SIZE) {
      setFileError('File vượt quá 50MB')
      setFile(null)
      return
    }
    setFileError(null)
    setFile(f)
  }

  const resetForm = (): void => {
    reset()
    setFile(null)
    setFileError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const onSubmit = async (values: FormValues): Promise<void> => {
    setSubmitting(true)
    try {
      let fileUrl = values.file_url?.trim() || undefined
      let mimeType: string | undefined

      if (file) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('folder', `documents/${projectId}`)
        const res = await api.post<CloudinaryResponse>('/upload/cloudinary', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        fileUrl = res.data.data.secure_url
        mimeType = file.type || undefined
      }

      await createMutation.mutateAsync({
        projectId,
        folderId,
        document_name: values.document_name,
        file_url: fileUrl,
        mime_type: mimeType,
        expiry_date: values.expiry_date || undefined,
        notes: values.notes || undefined,
      })

      toast.success('Thêm tài liệu thành công')
      resetForm()
      onOpenChange(false)
    } catch {
      toast.error('Thêm tài liệu thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = (isOpen: boolean): void => {
    if (!submitting) {
      if (!isOpen) resetForm()
      onOpenChange(isOpen)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Thêm tài liệu</DialogTitle>
          <DialogDescription>
            Thêm tài liệu vào thư mục <strong>{folderName}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="document_name">Tên tài liệu *</Label>
            <Input
              id="document_name"
              placeholder="VD: Giấy phép xây dựng số 123/GP"
              {...register('document_name')}
            />
            {errors.document_name && (
              <p className="text-sm text-destructive">{errors.document_name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="file">Upload file (tối đa 50MB)</Label>
            <Input
              id="file"
              type="file"
              ref={fileInputRef}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.mp4"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            />
            {file && (
              <p className="text-xs text-muted-foreground">
                {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            )}
            {fileError && <p className="text-sm text-destructive">{fileError}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="file_url" className="text-muted-foreground">
              Hoặc dán đường dẫn file có sẵn
            </Label>
            <Input
              id="file_url"
              placeholder="https://storage.example.com/doc.pdf"
              {...register('file_url')}
              disabled={!!file}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="expiry_date">Ngày hết hạn</Label>
              <Input id="expiry_date" type="date" {...register('expiry_date')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Ghi chú</Label>
              <Input id="notes" placeholder="Ghi chú..." {...register('notes')} />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={submitting || !!fileError}>
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Thêm tài liệu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
