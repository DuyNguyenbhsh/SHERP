import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, FileText, Loader2, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useDocumentSearch } from '@/entities/document'
import type { DocumentSearchParams, DocumentStatus } from '@/entities/document'
import { DocumentStatusBadge } from '@/features/document/ui/DocumentStatusBadge'
import { useProjects } from '@/entities/project'

const STATUS_OPTIONS: { value: DocumentStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'DRAFT', label: 'Nháp' },
  { value: 'PENDING_APPROVAL', label: 'Chờ duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Từ chối' },
  { value: 'VALID', label: 'Còn hiệu lực' },
  { value: 'EXPIRING_SOON', label: 'Sắp hết hạn' },
  { value: 'EXPIRED', label: 'Đã hết hạn' },
  { value: 'ARCHIVED', label: 'Lưu trữ' },
]

const DOC_TYPES: { value: string; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'CONTRACT', label: 'Hợp đồng' },
  { value: 'TECHNICAL', label: 'Kỹ thuật' },
  { value: 'QUALITY', label: 'Chất lượng' },
  { value: 'REPORT', label: 'Báo cáo' },
  { value: 'CERTIFICATE', label: 'Chứng chỉ' },
]

const docTypeLabel: Record<string, string> = {
  CONTRACT: 'Hợp đồng',
  TECHNICAL: 'Kỹ thuật',
  QUALITY: 'Chất lượng',
  REPORT: 'Báo cáo',
  CERTIFICATE: 'Chứng chỉ',
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function DocumentSearchPage(): React.JSX.Element {
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<DocumentStatus | 'ALL'>('ALL')
  const [docType, setDocType] = useState<string>('ALL')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [offset, setOffset] = useState(0)

  const { data: projects } = useProjects()
  const projectMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const p of projects ?? []) {
      map[p.id] = `${p.project_code} — ${p.project_name}`
    }
    return map
  }, [projects])

  const params: DocumentSearchParams = {
    keyword: keyword.trim() || undefined,
    status: status === 'ALL' ? undefined : status,
    doc_type: docType === 'ALL' ? undefined : docType,
    from_date: fromDate || undefined,
    to_date: toDate || undefined,
    limit: 20,
    offset,
  }

  const { data, isLoading, isFetching } = useDocumentSearch(params)

  const handleReset = (): void => {
    setKeyword('')
    setStatus('ALL')
    setDocType('ALL')
    setFromDate('')
    setToDate('')
    setOffset(0)
  }

  const total = data?.total ?? 0
  const items = data?.items ?? []
  const page = Math.floor(offset / 20) + 1
  const totalPages = Math.max(1, Math.ceil(total / 20))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Search className="h-6 w-6" /> Quản lý Tài liệu
        </h1>
        <p className="text-sm text-muted-foreground">
          Tìm kiếm toàn văn trên tên tài liệu, ghi chú, tags (hỗ trợ tiếng Việt không dấu)
        </p>
      </div>

      {/* Filter panel */}
      <div className="rounded-lg border bg-card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="md:col-span-2 space-y-1.5">
            <Label htmlFor="kw">Từ khoá</Label>
            <Input
              id="kw"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value)
                setOffset(0)
              }}
              placeholder="VD: hợp đồng, BOQ, ISO..."
            />
          </div>

          <div className="space-y-1.5">
            <Label>Trạng thái</Label>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v as DocumentStatus | 'ALL')
                setOffset(0)
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Loại tài liệu</Label>
            <Select
              value={docType}
              onValueChange={(v) => {
                setDocType(v)
                setOffset(0)
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="from">Từ ngày</Label>
            <Input
              id="from"
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value)
                setOffset(0)
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="to">Đến ngày</Label>
            <Input
              id="to"
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value)
                setOffset(0)
              }}
            />
          </div>

          <div className="flex items-end gap-2 md:col-span-2">
            <Button variant="outline" onClick={handleReset}>
              Đặt lại
            </Button>
            <p className="ml-auto text-sm text-muted-foreground">
              {isFetching && <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />}
              {total} kết quả
            </p>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <FileText className="mx-auto mb-2 h-8 w-8" /> Không có tài liệu phù hợp
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên tài liệu</TableHead>
                <TableHead>Dự án</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Hết hạn</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <Link
                      to={`/projects/${d.project_id}/documents`}
                      className="font-medium hover:text-blue-600"
                    >
                      {d.document_name}
                    </Link>
                    {d.notes && <p className="truncate text-xs text-muted-foreground">{d.notes}</p>}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                    {projectMap[d.project_id] ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {d.doc_type ? (docTypeLabel[d.doc_type] ?? d.doc_type) : '—'}
                  </TableCell>
                  <TableCell>
                    <DocumentStatusBadge status={d.status} />
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(d.expiry_date)}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(d.created_at).toLocaleDateString('vi-VN')}
                  </TableCell>
                  <TableCell>
                    {d.file_url && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                        <a href={d.file_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Pagination */}
        {total > 20 && (
          <div className="flex items-center justify-between border-t p-3">
            <p className="text-sm text-muted-foreground">
              Trang {page} / {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - 20))}
              >
                Trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={offset + 20 >= total}
                onClick={() => setOffset(offset + 20)}
              >
                Sau
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
