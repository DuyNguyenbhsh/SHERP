import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useCostSummary, useTransactions, useDeleteTransaction } from '@/entities/project'
import { vnd, fmtDate } from './projectDetailUtils'
import { SummaryCard } from './SharedCards'
import { AddTransactionDialog } from './AddTransactionDialog'
import { AddBudgetDialog } from './AddBudgetDialog'

export interface CostTabProps {
  projectId: string
}

export function CostTab({ projectId }: CostTabProps): React.JSX.Element {
  const { data: costSummary, isLoading: costLoading } = useCostSummary(projectId)
  const { data: transactions } = useTransactions(projectId)
  const deleteTx = useDeleteTransaction()
  const [txDialogOpen, setTxDialogOpen] = useState(false)
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false)

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard
          label="Tổng ngân sách"
          value={vnd(costSummary?.total_budget)}
          loading={costLoading}
        />
        <SummaryCard
          label="Chi phí thực tế"
          value={vnd(costSummary?.total_actual)}
          loading={costLoading}
          accent={
            costSummary && costSummary.total_actual > 0
              ? costSummary.total_actual > costSummary.total_budget
                ? 'red'
                : 'green'
              : undefined
          }
        />
        <SummaryCard
          label="Còn lại"
          value={vnd(costSummary?.remaining)}
          loading={costLoading}
          accent={costSummary ? (costSummary.remaining < 0 ? 'red' : 'green') : undefined}
        />
        <div
          className={`rounded-lg border p-4 ${(costSummary?.variance_percent ?? 0) > 0 ? 'border-red-200 bg-red-50/50' : (costSummary?.variance_percent ?? 0) < 0 ? 'border-green-200 bg-green-50/50' : ''}`}
        >
          <p className="text-xs font-medium text-muted-foreground">% Chênh lệch</p>
          {costLoading ? (
            <Loader2 className="mt-2 h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`text-2xl font-bold ${(costSummary?.variance_percent ?? 0) > 0 ? 'text-red-600' : (costSummary?.variance_percent ?? 0) < 0 ? 'text-green-600' : ''}`}
              >
                {(costSummary?.variance_percent ?? 0) > 0 ? '+' : ''}
                {costSummary?.variance_percent ?? 0}%
              </span>
              {(costSummary?.variance_percent ?? 0) > 0 ? (
                <TrendingUp className="h-5 w-5 text-red-500" />
              ) : (costSummary?.variance_percent ?? 0) < 0 ? (
                <TrendingDown className="h-5 w-5 text-green-500" />
              ) : (
                <Minus className="h-5 w-5 text-gray-400" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Budget vs Actual breakdown */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Ngân sách vs Thực tế theo hạng mục
          </h3>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => setBudgetDialogOpen(true)}
          >
            <Plus className="h-3 w-3" /> Thêm ngân sách
          </Button>
        </div>

        {costSummary?.breakdown?.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã</TableHead>
                <TableHead>Hạng mục</TableHead>
                <TableHead className="text-right">Ngân sách</TableHead>
                <TableHead className="text-right">Thực tế</TableHead>
                <TableHead className="text-right">Chênh lệch</TableHead>
                <TableHead className="text-right">GD</TableHead>
                <TableHead className="w-[60px]">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costSummary.breakdown.map((row) => {
                const diff = row.actual - row.planned
                const pct =
                  row.planned > 0
                    ? Math.round((row.actual / row.planned) * 100)
                    : row.actual > 0
                      ? 999
                      : 0
                const overBudget = diff > 0
                return (
                  <TableRow key={row.category_id} className={overBudget ? 'bg-red-50/40' : ''}>
                    <TableCell className="font-mono text-xs">{row.code}</TableCell>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-right">{vnd(row.planned)}</TableCell>
                    <TableCell className="text-right font-semibold">{vnd(row.actual)}</TableCell>
                    <TableCell
                      className={`text-right font-semibold ${overBudget ? 'text-red-600' : diff < 0 ? 'text-green-600' : ''}`}
                    >
                      {diff > 0 ? '+' : ''}
                      {vnd(diff)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{row.count}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 flex-1 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${pct > 100 ? 'bg-red-400' : pct > 80 ? 'bg-amber-400' : 'bg-green-400'}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-medium text-muted-foreground w-8 text-right">
                          {pct}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="flex items-center justify-center rounded-lg border border-dashed py-8 text-sm text-muted-foreground">
            Chưa có dữ liệu ngân sách. Thêm loại chi phí và ngân sách để bắt đầu.
          </div>
        )}
      </div>

      {/* Transaction list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Danh sách khoản chi thực tế
          </h3>
          <Button size="sm" className="gap-1" onClick={() => setTxDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Thêm khoản chi
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ngày</TableHead>
              <TableHead>Loại chi phí</TableHead>
              <TableHead>Mô tả</TableHead>
              <TableHead>Chứng từ</TableHead>
              <TableHead className="text-right">Số tiền</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!transactions?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Chưa có khoản chi nào
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="text-sm">{fmtDate(tx.transaction_date)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {tx.category?.code} — {tx.category?.name}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{tx.description ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {tx.reference_type ? `${tx.reference_type}` : '—'}
                    {tx.reference_id ? ` #${tx.reference_id}` : ''}
                  </TableCell>
                  <TableCell className="text-right font-semibold">{vnd(tx.amount)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-gray-400 hover:text-red-500"
                      onClick={() =>
                        deleteTx.mutate(tx.id, { onSuccess: () => toast.success('Đã xóa') })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AddTransactionDialog
        open={txDialogOpen}
        onOpenChange={setTxDialogOpen}
        projectId={projectId}
      />
      <AddBudgetDialog
        open={budgetDialogOpen}
        onOpenChange={setBudgetDialogOpen}
        projectId={projectId}
      />
    </div>
  )
}
