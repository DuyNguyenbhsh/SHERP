import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { PhotoUploader } from '@/shared/ui/PhotoUploader'
import type { ItemResultState } from '@/entities/checklist'
import {
  useChecklistInstance,
  useSubmitChecklistItem,
  type ChecklistItemTemplate,
  type ChecklistItemResult,
  type SubmitItemResultPayload,
} from '@/entities/checklist'
import { getErrorMessage } from '@/shared/api/axios'

export function ChecklistBody({ instanceId }: { instanceId: string }): React.JSX.Element {
  const { data: instance, isLoading } = useChecklistInstance(instanceId)
  const submitMut = useSubmitChecklistItem(instanceId)

  if (isLoading || !instance) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  const byItemId = new Map(instance.results.map((r) => [r.item_template_id, r]))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground">Template</div>
          <div className="font-medium">{instance.template.name}</div>
        </div>
        <Badge variant={instance.status === 'COMPLETED' ? 'default' : 'outline'}>
          {instance.status}
        </Badge>
      </div>

      {instance.template.items
        .sort((a, b) => a.display_order - b.display_order)
        .map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            existing={byItemId.get(item.id)}
            readonly={instance.status === 'COMPLETED'}
            onSubmit={(payload) =>
              submitMut.mutate(
                { itemId: item.id, payload },
                {
                  onSuccess: () => toast.success(`Đã lưu item #${item.display_order}`),
                  onError: (err) => toast.error(getErrorMessage(err, 'Lưu thất bại')),
                },
              )
            }
            isPending={submitMut.isPending}
          />
        ))}
    </div>
  )
}

function ItemCard({
  item,
  existing,
  readonly,
  onSubmit,
  isPending,
}: {
  item: ChecklistItemTemplate
  existing: ChecklistItemResult | undefined
  readonly: boolean
  onSubmit: (payload: SubmitItemResultPayload) => void
  isPending: boolean
}): React.JSX.Element {
  const [result, setResult] = useState(existing?.result ?? '')
  const [value, setValue] = useState(existing?.value ?? '')
  const [photos, setPhotos] = useState<string[]>(existing?.photos ?? [])
  const [notes, setNotes] = useState(existing?.notes ?? '')

  const submit = (): void => {
    onSubmit({
      result: result ? (result as keyof typeof ItemResultState) : undefined,
      value: value || undefined,
      photos: photos.length ? photos : undefined,
      notes: notes || undefined,
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="text-muted-foreground">#{item.display_order}</span>
          <span>{item.content}</span>
          {item.require_photo && (
            <Badge variant="outline" className="gap-1">
              <Camera className="h-3 w-3" /> Cần ảnh
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {item.result_type !== 'PHOTO_ONLY' && (
          <div className="flex gap-2">
            {(['PASS', 'FAIL', 'NA'] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={result === s ? 'default' : 'outline'}
                disabled={readonly}
                onClick={() => setResult(s)}
              >
                {s === 'PASS' ? 'Đạt' : s === 'FAIL' ? 'Không đạt' : 'N/A'}
              </Button>
            ))}
          </div>
        )}

        {(item.result_type === 'VALUE' || item.result_type === 'MIXED') && (
          <div className="flex items-center gap-2">
            <Input
              placeholder="Giá trị đo"
              disabled={readonly}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="max-w-xs"
            />
            {item.value_unit && (
              <span className="text-sm text-muted-foreground">{item.value_unit}</span>
            )}
          </div>
        )}

        <PhotoUploader
          value={photos}
          onChange={setPhotos}
          folder={`checklist/item-${item.id}`}
          disabled={readonly}
          label="Ảnh bằng chứng"
        />

        <Textarea
          placeholder="Ghi chú"
          disabled={readonly}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />

        <div className="flex justify-end">
          <Button size="sm" disabled={readonly || isPending} onClick={submit}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lưu
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
