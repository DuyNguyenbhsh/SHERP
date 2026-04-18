import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FolderArchive, FolderOpen, Loader2, Search } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useProjects } from '@/entities/project'
import type { ProjectStatus } from '@/entities/project'

const statusLabel: Record<ProjectStatus, string> = {
  DRAFT: 'Nháp',
  BIDDING: 'Đang đấu thầu',
  WON_BID: 'Trúng thầu',
  LOST_BID: 'Trượt thầu',
  ACTIVE: 'Đang triển khai',
  ON_HOLD: 'Tạm dừng',
  SETTLING: 'Đang quyết toán',
  SETTLED: 'Đã quyết toán',
  WARRANTY: 'Bảo hành',
  RETENTION_RELEASED: 'Đã giải tỏa bảo lưu',
  CANCELED: 'Hủy',
}

export function DocumentsHubPage(): React.JSX.Element {
  const [keyword, setKeyword] = useState('')
  const { data: projects, isLoading } = useProjects()

  const filtered = useMemo(() => {
    const list = projects ?? []
    if (!keyword.trim()) return list
    const q = keyword.trim().toLowerCase()
    return list.filter(
      (p) => p.project_code.toLowerCase().includes(q) || p.project_name.toLowerCase().includes(q),
    )
  }, [projects, keyword])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <FolderArchive className="h-6 w-6 text-primary" />
            Quản lý Tài liệu
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Chọn dự án để xem/upload/duyệt tài liệu, hoặc dùng "Tìm kiếm Tài liệu" để lọc toàn hệ
            thống.
          </p>
        </div>
        <Link to="/documents/search">
          <Button variant="outline" className="gap-2">
            <Search className="h-4 w-4" />
            Tìm kiếm Tài liệu
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm theo mã / tên dự án..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {filtered.length} / {projects?.length ?? 0} dự án
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FolderArchive className="h-12 w-12 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            {keyword ? 'Không tìm thấy dự án phù hợp' : 'Chưa có dự án nào'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Link
              key={p.id}
              to={`/projects/${p.id}/documents`}
              className="group rounded-lg border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/30"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[11px] text-muted-foreground">{p.project_code}</p>
                  <h3 className="mt-0.5 truncate text-sm font-semibold group-hover:text-primary">
                    {p.project_name}
                  </h3>
                </div>
                <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {statusLabel[p.status] ?? p.status}
                </Badge>
                {p.organization && (
                  <span className="truncate text-[11px] text-muted-foreground">
                    {p.organization.organization_name}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
