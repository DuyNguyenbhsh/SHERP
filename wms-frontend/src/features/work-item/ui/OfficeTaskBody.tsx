import { toast } from 'sonner'
import { Loader2, CheckCircle2, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  useOfficeTask,
  useToggleOfficeTaskItem,
  useCompleteOfficeTask,
} from '@/entities/office-task'
import { getErrorMessage } from '@/shared/api/axios'

export function OfficeTaskBody({ taskId }: { taskId: string }): React.JSX.Element {
  const { data: task, isLoading } = useOfficeTask(taskId)
  const toggleMut = useToggleOfficeTaskItem(taskId)
  const completeMut = useCompleteOfficeTask()

  if (isLoading || !task) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  const readonly = task.status === 'COMPLETED'

  const toggle = (itemId: string, currentDone: boolean): void => {
    toggleMut.mutate(
      { itemId, is_done: !currentDone },
      {
        onError: (err) => toast.error(getErrorMessage(err, 'Toggle thất bại')),
      },
    )
  }

  const complete = (): void => {
    completeMut.mutate(task.id, {
      onSuccess: () => toast.success('Đã hoàn thành task'),
      onError: (err) => toast.error(getErrorMessage(err, 'Hoàn thành thất bại')),
    })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{task.title}</span>
            <Badge variant={readonly ? 'default' : 'outline'}>{task.status}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {task.description && (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{task.description}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Items ({task.items.filter((i) => i.is_done).length}/{task.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {task.items.length === 0 && (
            <div className="text-sm text-muted-foreground">
              Task không có item. Bấm "Hoàn thành" khi xong.
            </div>
          )}
          {task.items
            .sort((a, b) => a.display_order - b.display_order)
            .map((item) => (
              <button
                key={item.id}
                onClick={() => toggle(item.id, item.is_done)}
                disabled={readonly || toggleMut.isPending}
                className="flex w-full items-center gap-3 rounded border p-3 text-left transition hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {item.is_done ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
                <span className={item.is_done ? 'line-through text-muted-foreground' : ''}>
                  {item.content}
                </span>
              </button>
            ))}
          {!readonly && task.items.length === 0 && (
            <div className="pt-2">
              <Button onClick={complete} disabled={completeMut.isPending}>
                {completeMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Hoàn thành
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
