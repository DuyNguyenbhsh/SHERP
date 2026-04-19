import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Image, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { PhotoUploader } from '@/shared/ui/PhotoUploader'
import {
  useIncident,
  useResolveIncident,
  useCloseIncident,
  useAddIncidentComment,
  INCIDENT_STATUS_LABELS,
  INCIDENT_SEVERITY_LABELS,
  INCIDENT_CATEGORY_LABELS,
} from '@/entities/incident'
import { api, getErrorMessage } from '@/shared/api/axios'
import { useAuthStore } from '@/features/auth/model/auth.store'

export function IncidentBody({ incidentId }: { incidentId: string }): React.JSX.Element {
  const { data: inc, isLoading } = useIncident(incidentId)
  const resolveMut = useResolveIncident()
  const closeMut = useCloseIncident()
  const commentMut = useAddIncidentComment(incidentId)
  const canResolve = useAuthStore((s) => s.hasPrivilege('RESOLVE_INCIDENT'))
  const canClose = useAuthStore((s) => s.hasPrivilege('CLOSE_INCIDENT'))
  const canExport = useAuthStore((s) => s.hasPrivilege('EXPORT_INCIDENT'))
  const [afterPhotos, setAfterPhotos] = useState<string[]>([])
  const [resolutionNote, setResolutionNote] = useState('')
  const [comment, setComment] = useState('')
  const [exporting, setExporting] = useState(false)

  const handleExport = async (): Promise<void> => {
    setExporting(true)
    try {
      const res = await api.get(`/incidents/${incidentId}/export`, {
        responseType: 'blob',
      })
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${inc?.incident_code ?? 'incident'}.docx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Đã xuất .docx')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Export thất bại'))
    } finally {
      setExporting(false)
    }
  }

  if (isLoading || !inc) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  const handleResolve = (): void => {
    if (afterPhotos.length === 0) {
      toast.error('BR-INC-05: cần ít nhất 1 ảnh AFTER_FIX')
      return
    }
    resolveMut.mutate(
      { id: inc.id, data: { photos: afterPhotos, resolution_note: resolutionNote || undefined } },
      {
        onSuccess: () => toast.success('Đã báo xong sự cố'),
        onError: (err) => toast.error(getErrorMessage(err, 'Resolve thất bại')),
      },
    )
  }

  const handleClose = (): void => {
    closeMut.mutate(inc.id, {
      onSuccess: () => toast.success('Đã đóng sự cố'),
      onError: (err) => toast.error(getErrorMessage(err, 'Close thất bại')),
    })
  }

  const handleComment = (): void => {
    if (!comment.trim()) return
    commentMut.mutate(comment, {
      onSuccess: () => {
        toast.success('Đã thêm ghi chú')
        setComment('')
      },
      onError: (err) => toast.error(getErrorMessage(err, 'Lưu thất bại')),
    })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="font-mono text-sm">{inc.incident_code}</span>
            <span className="flex-1">{inc.title}</span>
            <Badge variant="default">{INCIDENT_STATUS_LABELS[inc.status]}</Badge>
            {canExport && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleExport()}
                disabled={exporting}
              >
                {exporting ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <Download className="mr-1 h-3 w-3" />
                )}
                Export .docx
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <Badge variant="outline" className="mr-2">
              {INCIDENT_SEVERITY_LABELS[inc.severity]}
            </Badge>
            <Badge variant="outline">{INCIDENT_CATEGORY_LABELS[inc.category]}</Badge>
          </div>
          <p className="whitespace-pre-wrap">{inc.description}</p>
          {inc.location_text && (
            <p className="text-muted-foreground">Vị trí: {inc.location_text}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Image className="h-4 w-4" /> Ảnh ({inc.photos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
            {inc.photos.map((p) => (
              <a key={p.id} href={p.secure_url} target="_blank" rel="noreferrer">
                <img
                  src={p.secure_url}
                  alt={p.category}
                  className="aspect-square w-full rounded object-cover"
                />
                <div className="mt-1 text-xs text-muted-foreground">{p.category}</div>
              </a>
            ))}
            {inc.photos.length === 0 && (
              <div className="text-sm text-muted-foreground">Chưa có ảnh</div>
            )}
          </div>
        </CardContent>
      </Card>

      {canResolve && inc.status === 'IN_PROGRESS' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Báo xong (RESOLVE)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <PhotoUploader
              value={afterPhotos}
              onChange={setAfterPhotos}
              folder={`incident/${inc.id}/after`}
              label="Ảnh AFTER_FIX (BR-INC-05)"
            />
            <Textarea
              placeholder="Ghi chú khắc phục"
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              rows={2}
            />
            <Button onClick={handleResolve} disabled={resolveMut.isPending}>
              {resolveMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Báo xong
            </Button>
          </CardContent>
        </Card>
      )}

      {canClose && inc.status === 'RESOLVED' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Xác nhận đóng (QLDA)</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={handleClose} disabled={closeMut.isPending}>
              {closeMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Đóng sự cố
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timeline ({inc.comments.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {inc.comments.map((c) => (
            <div key={c.id} className="rounded border bg-muted/30 p-3 text-sm">
              <div className="text-xs text-muted-foreground">
                {new Date(c.created_at).toLocaleString('vi-VN')} · {c.actor_id.slice(0, 8)}
              </div>
              <div className="whitespace-pre-wrap">{c.body}</div>
            </div>
          ))}
          <div className="flex gap-2">
            <Textarea
              placeholder="Thêm ghi chú / bình luận"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
            />
            <Button onClick={handleComment} disabled={commentMut.isPending}>
              Gửi
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
