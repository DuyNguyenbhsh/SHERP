import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Send } from 'lucide-react'

import { Button } from '@/components/ui/button'
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
import { useSubmitDocumentApproval, useDocumentVersion } from '@/entities/document'

interface SubmitApprovalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentId: string
  versionId: string
  documentName: string
}

export function SubmitApprovalDialog({
  open,
  onOpenChange,
  documentId,
  versionId,
  documentName,
}: SubmitApprovalDialogProps): React.JSX.Element {
  const [note, setNote] = useState('')
  const submitMut = useSubmitDocumentApproval()
  const { data: version } = useDocumentVersion(
    open ? documentId : undefined,
    open ? versionId : undefined,
  )
  const versionNumber = version?.version_number ?? 'phiên bản hiện tại'

  const handleSubmit = (): void => {
    submitMut.mutate(
      { documentId, versionId, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast.success('Đã gửi yêu cầu phê duyệt')
          setNote('')
          onOpenChange(false)
        },
        onError: (e: unknown) => {
          const err = e as { response?: { data?: { message?: string } } }
          toast.error(err.response?.data?.message ?? 'Gửi duyệt thất bại')
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Gửi phê duyệt</DialogTitle>
          <DialogDescription>
            Gửi {versionNumber} của <strong>{documentName}</strong> đi phê duyệt theo quy trình đã
            cấu hình cho <code>DOCUMENT_VERSION</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="note">Ghi chú (tùy chọn)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Đề nghị BGĐ phê duyệt..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={submitMut.isPending}>
            {submitMut.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Gửi duyệt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
