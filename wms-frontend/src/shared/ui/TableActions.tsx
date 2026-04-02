import { useState } from 'react'
import { toast } from 'sonner'
import { Download, Upload, FileDown, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { api } from '@/shared/api/axios'
import { ImportModal } from './ImportModal'

interface TableActionsProps {
  /** URL endpoint cho download template, VD: '/projects/excel/template' */
  templateUrl: string
  /** URL endpoint cho import, VD: '/projects/excel/import' */
  importUrl: string
  /** URL endpoint cho export, VD: '/projects/excel/export' */
  exportUrl: string
  /** Query params hiện tại để gửi kèm export (VD: { status: 'ACTIVE' }) */
  exportParams?: Record<string, string | undefined>
  /** Callback khi import thành công (invalidate queries) */
  onImportSuccess?: () => void
  /** Tiêu đề modal import */
  importTitle?: string
  /** Mô tả modal import */
  importDescription?: string
}

async function downloadFile(
  url: string,
  params?: Record<string, string | undefined>,
): Promise<void> {
  const cleanParams: Record<string, string> = {}
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) cleanParams[k] = v
    }
  }

  const response = await api.get(url, {
    params: cleanParams,
    responseType: 'blob',
  })

  // Extract filename from Content-Disposition header
  const disposition = response.headers['content-disposition'] as string | undefined
  let fileName = 'download.xlsx'
  if (disposition) {
    const match = disposition.match(/filename="?([^";\n]+)"?/)
    if (match) fileName = match[1]
  }

  // Trigger download
  const blob = new Blob([response.data as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}

export function TableActions({
  templateUrl,
  importUrl,
  exportUrl,
  exportParams,
  onImportSuccess,
  importTitle = 'Import dữ liệu',
  importDescription = 'Tải lên file Excel (.xlsx) để import dữ liệu hàng loạt',
}: TableActionsProps): React.JSX.Element {
  const [importOpen, setImportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      await downloadFile(exportUrl, exportParams)
      toast.success('Xuất Excel thành công')
    } catch {
      toast.error('Xuất Excel thất bại')
    } finally {
      setExporting(false)
    }
  }

  const handleTemplate = async () => {
    setDownloading(true)
    try {
      await downloadFile(templateUrl)
      toast.success('Tải mẫu thành công')
    } catch {
      toast.error('Tải mẫu thất bại')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => void handleTemplate()}
          disabled={downloading}
        >
          {downloading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileDown className="h-3.5 w-3.5" />
          )}
          Tải mẫu
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setImportOpen(true)}>
          <Upload className="h-3.5 w-3.5" />
          Import
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => void handleExport()}
          disabled={exporting}
        >
          {exporting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          Export
        </Button>
      </div>

      <ImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        title={importTitle}
        description={importDescription}
        importUrl={importUrl}
        onSuccess={onImportSuccess}
      />
    </>
  )
}
