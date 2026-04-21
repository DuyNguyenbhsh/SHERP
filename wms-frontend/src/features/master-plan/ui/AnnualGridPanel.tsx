import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { downloadAnnualGridXlsx, useAnnualGrid, type CellActualStatus } from '../api/useAnnualGrid'
import { EXECUTOR_PARTY_LABELS } from '@/entities/master-plan'

interface Props {
  planId: string
  planCode: string
  defaultYear: number
}

const CELL_BG: Record<CellActualStatus, string> = {
  NONE: '',
  ON_TIME: 'bg-green-100',
  LATE: 'bg-amber-100',
  MISSED: 'bg-red-100',
  UPCOMING: 'bg-slate-100',
}

export function AnnualGridPanel({ planId, planCode, defaultYear }: Props): React.JSX.Element {
  const [year, setYear] = useState(defaultYear)
  const { data, isLoading, isError } = useAnnualGrid(planId, year)
  const [exporting, setExporting] = useState(false)

  const handleExport = async (): Promise<void> => {
    try {
      setExporting(true)
      await downloadAnnualGridXlsx(planId, year, `MasterPlan_${planCode}_${year}.xlsx`)
      toast.success('Đã xuất XLSX')
    } catch (err) {
      toast.error((err as Error).message || 'Xuất XLSX thất bại')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Annual Plan Grid</CardTitle>
        <div className="flex items-center gap-2">
          <Label className="text-sm">Năm</Label>
          <Input
            type="number"
            min={2020}
            max={2100}
            className="h-8 w-24"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void handleExport()
            }}
            disabled={exporting || !data}
          >
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Xuất XLSX
          </Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {isError && (
          <p className="py-4 text-center text-sm text-destructive">Không tải được grid</p>
        )}
        {data && data.rows.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Chưa có Task Template — thêm TaskTemplate từ tab "Cây WBS" để hiện lên grid.
          </p>
        )}
        {data && data.rows.length > 0 && (
          <table className="min-w-max border-collapse text-xs">
            <thead className="sticky top-0 bg-muted">
              <tr>
                <th className="sticky left-0 z-10 border bg-muted px-2 py-1 text-left">HỆ THỐNG</th>
                <th className="sticky left-[140px] z-10 border bg-muted px-2 py-1 text-left">
                  HẠNG MỤC
                </th>
                <th className="sticky left-[280px] z-10 border bg-muted px-2 py-1 text-left">
                  CÔNG VIỆC
                </th>
                <th className="border px-2 py-1">THỰC HIỆN</th>
                <th className="border px-2 py-1">TS</th>
                {data.weeks.map((w) => (
                  <th key={w.iso_week} className="border px-1 py-1 text-center">
                    W{w.iso_week}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.task_template_id} className="hover:bg-accent/30">
                  <td className="sticky left-0 z-10 max-w-[140px] truncate border bg-background px-2 py-1">
                    {row.system?.name_vi ?? '—'}
                  </td>
                  <td className="sticky left-[140px] z-10 max-w-[140px] truncate border bg-background px-2 py-1">
                    {row.equipment_item?.name_vi ?? '—'}
                  </td>
                  <td className="sticky left-[280px] z-10 max-w-[280px] border bg-background px-2 py-1">
                    <div className="font-medium">{row.task_name_vi}</div>
                    {row.task_name_en && (
                      <div className="text-muted-foreground">{row.task_name_en}</div>
                    )}
                  </td>
                  <td className="border px-2 py-1 text-center">
                    {EXECUTOR_PARTY_LABELS[row.executor_party]}
                  </td>
                  <td className="border px-2 py-1 text-center font-mono">{row.freq_code ?? '—'}</td>
                  {row.cells.map((cell) => (
                    <td
                      key={cell.iso_week}
                      className={`border px-1 py-1 text-center ${CELL_BG[cell.actual_status]}`}
                      title={`Tuần ${cell.iso_week} — ${cell.actual_status}`}
                    >
                      {cell.planned ? (row.freq_code ?? '✓') : ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  )
}
