import { Loader2, TrendingUp, TrendingDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useEarnedValue } from '@/entities/project'

function vnd(v: number): string {
  return v.toLocaleString('vi-VN') + ' ₫'
}

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: 'red' | 'green'
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${accent === 'red' ? 'border-red-200 bg-red-50/50' : accent === 'green' ? 'border-green-200 bg-green-50/50' : 'bg-card'}`}
    >
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p
        className={`mt-1 text-lg font-bold ${accent === 'red' ? 'text-red-600' : accent === 'green' ? 'text-green-600' : ''}`}
      >
        {value}
      </p>
    </div>
  )
}

export function EvmTab({ projectId }: { projectId: string }): React.JSX.Element {
  const { data: evm, isLoading } = useEarnedValue(projectId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!evm) {
    return (
      <p className="text-center text-muted-foreground py-12">
        Chưa có dữ liệu EVM. Cần thiết lập WBS + CBS trước.
      </p>
    )
  }

  const s = evm.summary
  const isOver = s.status === 'OVER_BUDGET'

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div
        className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${isOver ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}
      >
        {isOver ? (
          <TrendingUp className="h-5 w-5 text-red-500" />
        ) : (
          <TrendingDown className="h-5 w-5 text-green-500" />
        )}
        <span className={`font-semibold ${isOver ? 'text-red-700' : 'text-green-700'}`}>
          {isOver ? 'VƯỢT NGÂN SÁCH' : 'TRONG NGÂN SÁCH'}
        </span>
        <span className="text-sm text-muted-foreground">
          CPI = {s.cpi} | SPI = {s.spi}
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-3">
        <KpiCard label="BAC (Tổng NS)" value={vnd(s.bac)} />
        <KpiCard label="EV (Giá trị đạt)" value={vnd(s.total_ev)} />
        <KpiCard
          label="AC (Chi phí TT)"
          value={vnd(s.total_ac)}
          accent={isOver ? 'red' : undefined}
        />
        <KpiCard
          label="CV (Chênh lệch)"
          value={vnd(s.cost_variance)}
          accent={s.cost_variance < 0 ? 'red' : 'green'}
        />
        <KpiCard label="EAC (Dự báo)" value={vnd(s.eac)} accent={s.eac > s.bac ? 'red' : 'green'} />
      </div>

      {/* Breakdown table */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Chi tiết EVM theo WBS
        </h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã WBS</TableHead>
              <TableHead>Hạng mục</TableHead>
              <TableHead className="text-right">% HT</TableHead>
              <TableHead className="text-right">PV</TableHead>
              <TableHead className="text-right">EV</TableHead>
              <TableHead className="text-right">AC</TableHead>
              <TableHead className="text-right">CV</TableHead>
              <TableHead>CPI</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {evm.breakdown.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Chưa có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              evm.breakdown.map((row) => (
                <TableRow key={row.wbs_id} className={row.cost_variance < 0 ? 'bg-red-50/40' : ''}>
                  <TableCell className="font-mono text-xs">{row.wbs_code}</TableCell>
                  <TableCell className="font-medium">{row.wbs_name}</TableCell>
                  <TableCell className="text-right">{row.progress_percent}%</TableCell>
                  <TableCell className="text-right">{vnd(row.planned_value)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {vnd(row.earned_value)}
                  </TableCell>
                  <TableCell className="text-right">{vnd(row.actual_cost)}</TableCell>
                  <TableCell
                    className={`text-right font-semibold ${row.cost_variance < 0 ? 'text-red-600' : 'text-green-600'}`}
                  >
                    {row.cost_variance >= 0 ? '+' : ''}
                    {vnd(row.cost_variance)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.cpi >= 1 ? 'default' : 'destructive'} className="text-xs">
                      {row.cpi}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
