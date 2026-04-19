import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PhotoUploader } from '@/shared/ui/PhotoUploader'
import {
  useCreateIncident,
  IncidentSeverity,
  IncidentCategory,
  INCIDENT_SEVERITY_LABELS,
  INCIDENT_CATEGORY_LABELS,
} from '@/entities/incident'
import { getErrorMessage } from '@/shared/api/axios'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  defaultProjectId?: string
}

export function CreateIncidentDialog({
  open,
  onOpenChange,
  defaultProjectId,
}: Props): React.JSX.Element {
  const createMut = useCreateIncident()
  const [form, setForm] = useState({
    title: '',
    description: '',
    project_id: defaultProjectId ?? '',
    severity: IncidentSeverity.MEDIUM,
    category: IncidentCategory.OTHER,
    location_text: '',
    related_asset: '',
  })
  const [photos, setPhotos] = useState<string[]>([])

  useEffect(() => {
    if (open) {
      setForm({
        title: '',
        description: '',
        project_id: defaultProjectId ?? '',
        severity: IncidentSeverity.MEDIUM,
        category: IncidentCategory.OTHER,
        location_text: '',
        related_asset: '',
      })
      setPhotos([])
    }
  }, [open, defaultProjectId])

  const handleSubmit = (): void => {
    if (!form.title || !form.project_id) {
      toast.error('Nhập đủ tiêu đề + project UUID')
      return
    }
    if (form.description.length < 20) {
      toast.error('BR-INC-01: Mô tả ≥ 20 ký tự')
      return
    }
    if (photos.length === 0) {
      toast.error('BR-INC-01: Cần ≥ 1 ảnh bằng chứng')
      return
    }
    createMut.mutate(
      {
        title: form.title,
        description: form.description,
        project_id: form.project_id,
        severity: form.severity,
        category: form.category,
        location_text: form.location_text || undefined,
        related_asset: form.related_asset || undefined,
        photos,
      },
      {
        onSuccess: () => {
          toast.success('Đã báo sự cố')
          onOpenChange(false)
        },
        onError: (err) => toast.error(getErrorMessage(err, 'Tạo sự cố thất bại')),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Báo sự cố mới</DialogTitle>
          <DialogDescription>
            Mã IC-YYMMDD-XXX sẽ được sinh tự động · cần ≥ 1 ảnh bằng chứng
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-3 items-center gap-3">
            <Label>Project UUID *</Label>
            <Input
              className="col-span-2"
              value={form.project_id}
              onChange={(e) => setForm({ ...form, project_id: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-3">
            <Label>Tiêu đề *</Label>
            <Input
              className="col-span-2"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-3">
            <Label>Mức độ</Label>
            <Select
              value={form.severity}
              onValueChange={(v) => setForm({ ...form, severity: v as typeof form.severity })}
            >
              <SelectTrigger className="col-span-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(INCIDENT_SEVERITY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 items-center gap-3">
            <Label>Loại</Label>
            <Select
              value={form.category}
              onValueChange={(v) => setForm({ ...form, category: v as typeof form.category })}
            >
              <SelectTrigger className="col-span-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(INCIDENT_CATEGORY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 items-start gap-3">
            <Label className="pt-2">Mô tả *</Label>
            <Textarea
              className="col-span-2"
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Mô tả chi tiết (≥ 20 ký tự)"
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-3">
            <Label>Vị trí</Label>
            <Input
              className="col-span-2"
              value={form.location_text}
              onChange={(e) => setForm({ ...form, location_text: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-3">
            <Label>Thiết bị / Asset</Label>
            <Input
              className="col-span-2"
              value={form.related_asset}
              onChange={(e) => setForm({ ...form, related_asset: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 items-start gap-3">
            <Label className="pt-2">Ảnh bằng chứng *</Label>
            <div className="col-span-2">
              <PhotoUploader
                value={photos}
                onChange={setPhotos}
                folder="incidents/new"
                label="Thêm ảnh BEFORE_FIX"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createMut.isPending}
          >
            Huỷ
          </Button>
          <Button onClick={handleSubmit} disabled={createMut.isPending}>
            {createMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Báo sự cố
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
