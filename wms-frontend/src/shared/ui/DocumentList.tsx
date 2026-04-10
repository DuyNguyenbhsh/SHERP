import {
  FileText,
  Image,
  FileSpreadsheet,
  FileType,
  Archive,
  File,
  ExternalLink,
  Trash2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  getFileIcon,
  isImageUrl,
  formatFileSize,
  formatRelativeTime,
} from '@/shared/lib/file-utils'

export interface DocumentItem {
  id: string
  file_url: string
  file_name: string
  file_size: number | null
  uploaded_by_role: string
  uploaded_by_name: string | null
  uploaded_at: string
}

interface DocumentListProps {
  documents: DocumentItem[]
  onDelete?: (id: string) => void
  canDelete?: boolean
  emptyText?: string
}

const ICON_MAP = {
  pdf: <FileText className="h-8 w-8 text-red-500" />,
  image: <Image className="h-8 w-8 text-blue-500" />,
  excel: <FileSpreadsheet className="h-8 w-8 text-green-600" />,
  word: <FileType className="h-8 w-8 text-blue-700" />,
  archive: <Archive className="h-8 w-8 text-amber-600" />,
  file: <File className="h-8 w-8 text-gray-500" />,
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  PROPOSER: { label: 'Người đề xuất', color: 'bg-gray-100 text-gray-700' },
  APPROVER: { label: 'BP Duyệt bổ sung', color: 'bg-blue-100 text-blue-700' },
}

export function DocumentList({
  documents,
  onDelete,
  canDelete = false,
  emptyText,
}: DocumentListProps): React.JSX.Element {
  if (!documents.length) {
    return (
      <p className="text-xs text-muted-foreground italic py-2">
        {emptyText || 'Chưa có chứng từ đính kèm'}
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => {
        const iconType = getFileIcon(doc.file_name)
        const isImg = isImageUrl(doc.file_url)
        const roleInfo = ROLE_LABELS[doc.uploaded_by_role] || ROLE_LABELS.PROPOSER

        return (
          <div
            key={doc.id}
            className="flex items-center gap-3 rounded-lg border p-2.5 hover:bg-muted/30 transition-colors group"
          >
            {/* Icon / Thumbnail */}
            <div className="shrink-0 w-10 h-10 flex items-center justify-center rounded bg-muted/50">
              {isImg ? (
                <img
                  src={doc.file_url}
                  alt={doc.file_name}
                  className="w-10 h-10 rounded object-cover"
                  loading="lazy"
                />
              ) : (
                ICON_MAP[iconType]
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-blue-600 hover:underline truncate max-w-[250px]"
                  title={doc.file_name}
                >
                  {doc.file_name}
                </a>
                <ExternalLink className="h-3 w-3 text-blue-400 shrink-0" />
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                {doc.file_size && <span>{formatFileSize(doc.file_size)}</span>}
                <span>{doc.uploaded_by_name || 'Hệ thống'}</span>
                <span>{formatRelativeTime(doc.uploaded_at)}</span>
              </div>
            </div>

            {/* Role badge */}
            <Badge variant="secondary" className={`text-[9px] shrink-0 ${roleInfo.color}`}>
              {roleInfo.label}
            </Badge>

            {/* Delete */}
            {canDelete && onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                onClick={() => onDelete(doc.id)}
                title="Xóa chứng từ"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )
      })}
    </div>
  )
}
