import { History } from 'lucide-react'
import { useProjectHistory } from '@/entities/project'

export interface HistoryTabProps {
  projectId: string
}

export function HistoryTab({ projectId }: HistoryTabProps): React.JSX.Element {
  const { data: history } = useProjectHistory(projectId)

  if (!history?.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-muted-foreground">
        <History className="mb-2 h-8 w-8" />
        <p className="text-sm">Chưa có lịch sử thay đổi</p>
      </div>
    )
  }

  return (
    <div className="relative ml-4 border-l-2 border-violet-200 pl-6 space-y-0">
      {history.map((h, idx) => {
        const fieldLabels: Record<string, string> = {
          manager_id: 'Giám đốc DA',
          department_id: 'Phòng ban',
          investor_id: 'Chủ đầu tư',
          organization_id: 'Tổ chức',
          status: 'Trạng thái',
          stage: 'Giai đoạn',
          budget: 'Ngân sách',
        }
        const fieldName = fieldLabels[h.field_name] ?? h.field_name
        const meta = h.metadata as Record<string, string> | null
        const oldDisplay = meta?.old_formatted ?? h.old_label ?? h.old_value ?? '(trống)'
        const newDisplay = meta?.new_formatted ?? h.new_label ?? h.new_value ?? '(trống)'
        const isBudget = h.field_name === 'budget'
        const isFirst = idx === 0

        return (
          <div key={h.id} className="relative pb-6">
            <div
              className={`absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 ${isFirst ? 'border-violet-500 bg-violet-500' : 'border-violet-300 bg-white'}`}
            >
              {isFirst && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
            </div>
            <div className="rounded-lg border bg-card px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-semibold text-gray-800">{fieldName}</span> thay đổi
                  </p>
                  <div className="mt-1.5 flex items-center gap-2 text-sm">
                    <span className="inline-flex items-center rounded border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                      {oldDisplay}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className="inline-flex items-center rounded border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                      {newDisplay}
                    </span>
                  </div>
                  {isBudget && meta?.difference && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Chênh lệch: <span className="font-medium">{meta.difference}</span>
                    </p>
                  )}
                </div>
                <p className="shrink-0 text-xs text-gray-400 whitespace-nowrap">
                  {new Date(h.changed_at).toLocaleString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              {h.change_reason && (
                <div className="mt-2 flex items-start gap-1.5 rounded bg-amber-50 border border-amber-200 px-2.5 py-1.5">
                  <span className="text-xs text-amber-800">
                    <span className="font-semibold">Lý do:</span> {h.change_reason}
                  </span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
