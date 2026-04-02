import { useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/shared/api/axios'
import { Trash2, Upload, Loader2, FileSpreadsheet, AlertTriangle, AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useBoqItems, useDeleteBoqItem, useImportBoq } from '@/entities/project'
import type { BoqItem } from '@/entities/project'

function vnd(v: number | null | undefined): string {
  if (v == null) return '—'
  return Number(v).toLocaleString('vi-VN') + ' ₫'
}

function getConsumptionStatus(item: BoqItem): { pct: number; level: 'ok' | 'warning' | 'danger' } {
  const qty = Number(item.quantity)
  const issued = Number(item.issued_qty)
  if (qty <= 0) return { pct: 0, level: 'ok' }
  const pct = Math.round((issued / qty) * 100)
  if (pct > 100) return { pct, level: 'danger' }
  if (pct > 90) return { pct, level: 'warning' }
  return { pct, level: 'ok' }
}

export function BoqTab({ projectId }: { projectId: string }): React.JSX.Element {
  const { data: items, isLoading } = useBoqItems(projectId)
  const deleteBoq = useDeleteBoqItem()
  const importBoq = useImportBoq()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.match(/\.xlsx?$/i)) {
        toast.error('Chỉ hỗ trợ file Excel (.xlsx, .xls)')
        return
      }
      setImporting(true)
      importBoq.mutate(
        { project_id: projectId, file },
        {
          onSuccess: (result) => {
            toast.success(`Import: ${result.success_rows}/${result.total_rows} dòng thành công`)
            if (result.error_rows > 0) toast.warning(`${result.error_rows} dòng lỗi`)
          },
          onError: (err: unknown) => toast.error(getErrorMessage(err, 'Import thất bại')),
          onSettled: () => {
            setImporting(false)
            if (fileRef.current) fileRef.current.value = ''
          },
        },
      )
    },
    [importBoq, projectId],
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  // Thống kê
  const stats = items?.reduce(
    (acc, item) => {
      const s = getConsumptionStatus(item)
      if (s.level === 'danger') acc.danger++
      else if (s.level === 'warning') acc.warning++
      acc.totalValue += Number(item.total_price)
      return acc
    },
    { danger: 0, warning: 0, totalValue: 0 },
  ) ?? { danger: 0, warning: 0, totalValue: 0 }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header + Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            BOQ — Khối lượng dự toán ({items?.length ?? 0} hạng mục)
          </h3>
          {(stats.warning > 0 || stats.danger > 0) && (
            <div className="flex items-center gap-3 text-xs">
              {stats.danger > 0 && (
                <span className="flex items-center gap-1 text-red-600 font-medium">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {stats.danger} vượt định mức
                </span>
              )}
              {stats.warning > 0 && (
                <span className="flex items-center gap-1 text-amber-600 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {stats.warning} sắp hết
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleInputChange}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => fileRef.current?.click()}
            disabled={importing}
          >
            {importing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            Import Excel
          </Button>
        </div>
      </div>

      {/* Drag-drop zone khi chưa có dữ liệu hoặc luôn hiển thị ở trên */}
      <div
        className={`relative rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          dragOver
            ? 'border-blue-400 bg-blue-50/50'
            : 'border-gray-200 hover:border-gray-300 bg-gray-50/30'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        {importing ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-sm font-medium text-blue-600">Đang import...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <FileSpreadsheet
              className={`h-8 w-8 ${dragOver ? 'text-blue-500' : 'text-gray-400'}`}
            />
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-blue-600 hover:underline cursor-pointer">
                Chọn file
              </span>{' '}
              hoặc kéo thả file Excel (.xlsx) vào đây
            </p>
            <p className="text-xs text-muted-foreground">
              Cột bắt buộc: item_code, item_name, unit, quantity, unit_price
            </p>
          </div>
        )}
      </div>

      {/* BOQ Table */}
      {items && items.length > 0 && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-[80px]">Mã</TableHead>
                <TableHead>Hạng mục</TableHead>
                <TableHead className="w-[60px]">ĐVT</TableHead>
                <TableHead className="text-right w-[100px]">KL dự toán</TableHead>
                <TableHead className="text-right w-[110px]">Đơn giá</TableHead>
                <TableHead className="text-right w-[120px]">Thành tiền</TableHead>
                <TableHead className="text-right w-[90px]">Đã xuất</TableHead>
                <TableHead className="w-[150px]">Tỷ lệ tiêu thụ</TableHead>
                <TableHead className="w-[40px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item: BoqItem) => {
                const { pct, level } = getConsumptionStatus(item)

                return (
                  <TableRow
                    key={item.id}
                    className={
                      level === 'danger'
                        ? 'bg-red-50/50'
                        : level === 'warning'
                          ? 'bg-amber-50/50'
                          : ''
                    }
                  >
                    <TableCell className="font-mono text-xs">{item.item_code}</TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium text-sm">{item.item_name}</span>
                        {item.wbs && (
                          <p className="text-[10px] text-muted-foreground">
                            WBS: {item.wbs.code} — {item.wbs.name}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{item.unit}</TableCell>
                    <TableCell className="text-right text-sm">
                      {Number(item.quantity).toLocaleString('vi-VN')}
                    </TableCell>
                    <TableCell className="text-right text-sm">{vnd(item.unit_price)}</TableCell>
                    <TableCell className="text-right font-semibold text-sm">
                      {vnd(item.total_price)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold text-sm ${level === 'danger' ? 'text-red-600' : ''}`}
                    >
                      {Number(item.issued_qty).toLocaleString('vi-VN')}
                    </TableCell>

                    {/* Tỷ lệ tiêu thụ với cảnh báo */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 flex-1 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              level === 'danger'
                                ? 'bg-red-500'
                                : level === 'warning'
                                  ? 'bg-amber-500'
                                  : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-1 w-14 justify-end">
                          {level === 'danger' && (
                            <AlertCircle className="h-3 w-3 text-red-500 shrink-0" />
                          )}
                          {level === 'warning' && (
                            <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                          )}
                          <span
                            className={`text-xs font-semibold ${
                              level === 'danger'
                                ? 'text-red-600'
                                : level === 'warning'
                                  ? 'text-amber-600'
                                  : 'text-gray-600'
                            }`}
                          >
                            {pct}%
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-gray-400 hover:text-red-500"
                        onClick={() =>
                          deleteBoq.mutate(
                            { boq_id: item.id, project_id: projectId },
                            { onSuccess: () => toast.success('Đã xóa') },
                          )
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}

              {/* Tổng cộng */}
              <TableRow className="bg-muted/20 font-semibold">
                <TableCell colSpan={5} className="text-right text-sm">
                  Tổng giá trị BOQ:
                </TableCell>
                <TableCell className="text-right text-sm">{vnd(stats.totalValue)}</TableCell>
                <TableCell colSpan={3} />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
