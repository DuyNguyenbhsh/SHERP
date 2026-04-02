import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

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

export function AddDocumentDialog({
  open,
  onOpenChange,
  projectId,
  folderId,
  folderName,
}: AddDocumentDialogProps) {
  const createMutation = useCreateDocument()
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { document_name: '', file_url: '', expiry_date: '', notes: '' },
  })

  const onSubmit = (values: FormValues): void => {
    setSubmitting(true)
    createMutation.mutate(
      {
        projectId,
        folderId,
        document_name: values.document_name,
        file_url: values.file_url || undefined,
        expiry_date: values.expiry_date || undefined,
        notes: values.notes || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Thêm tài liệu thành công')
          reset()
          onOpenChange(false)
        },
        onError: () => toast.error('Thêm tài liệu thất bại'),
        onSettled: () => setSubmitting(false),
      },
    )
  }

  const handleClose = (isOpen: boolean): void => {
    if (!submitting) {
      if (!isOpen) reset()
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
            <Label htmlFor="file_url">Đường dẫn file</Label>
            <Input
              id="file_url"
              placeholder="https://storage.example.com/doc.pdf"
              {...register('file_url')}
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
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Thêm tài liệu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
