import { useMemo, useState } from 'react'
import { Loader2, Plus, Ban, ShoppingCart, TrendingUp, Users, Gauge } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  useQuotes,
  useSalesOrders,
  useCancelSalesOrder,
  useTransitionQuote,
  useSalesKpi,
  QUOTE_STATUS_LABELS,
  SALES_ORDER_STATUS_LABELS,
  type SalesOrder,
  type SalesQuote,
} from '@/entities/sales'
import { CreateSalesOrderDialog } from '@/features/sales/ui/CreateSalesOrderDialog'
import { getErrorMessage } from '@/shared/api/axios'

const QUOTE_STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  DRAFT: 'outline',
  SENT: 'secondary',
  ACCEPTED: 'default',
  REJECTED: 'destructive',
  EXPIRED: 'destructive',
}

const ORDER_STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  CONFIRMED: 'outline',
  FULFILLING: 'secondary',
  DELIVERED: 'default',
  CANCELED: 'destructive',
}

function formatNum(v: number | string): string {
  return new Intl.NumberFormat('vi-VN').format(Number(v))
}

export function SalesPage(): React.JSX.Element {
  const [tab, setTab] = useState<'orders' | 'quotes'>('orders')
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL')
  const [quoteStatusFilter, setQuoteStatusFilter] = useState<string>('ALL')
  const [createSoOpen, setCreateSoOpen] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<SalesOrder | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  const { data: kpi } = useSalesKpi()
  const { data: orders, isLoading: loadingOrders } = useSalesOrders({
    status: orderStatusFilter === 'ALL' ? undefined : orderStatusFilter,
  })
  const { data: quotes, isLoading: loadingQuotes } = useQuotes({
    status: quoteStatusFilter === 'ALL' ? undefined : quoteStatusFilter,
  })

  const cancelMut = useCancelSalesOrder()
  const transitionMut = useTransitionQuote()

  const handleTransition = (q: SalesQuote, action: 'send' | 'accept' | 'reject'): void => {
    transitionMut.mutate(
      { id: q.id, action },
      {
        onSuccess: () => toast.success(`${q.quote_number} → ${action}`),
        onError: (err) => toast.error(getErrorMessage(err, 'Chuyển trạng thái thất bại')),
      },
    )
  }

  const handleCancel = (): void => {
    if (!cancelTarget || !cancelReason.trim()) {
      toast.error('Nhập lý do hủy')
      return
    }
    cancelMut.mutate(
      { id: cancelTarget.id, reason: cancelReason },
      {
        onSuccess: () => {
          toast.success(`Đã hủy ${cancelTarget.order_number}`)
          setCancelTarget(null)
          setCancelReason('')
        },
        onError: (err) => toast.error(getErrorMessage(err, 'Hủy thất bại')),
      },
    )
  }

  const winRate = useMemo(() => {
    const allQuotes = quotes ?? []
    const sentOrBeyond = allQuotes.filter((q) => q.status !== 'DRAFT').length
    const accepted = allQuotes.filter((q) => q.status === 'ACCEPTED').length
    if (sentOrBeyond === 0) return 0
    return Math.round((accepted / sentOrBeyond) * 100)
  }, [quotes])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bán hàng (O2C)</h1>
          <p className="text-muted-foreground text-sm">
            Quản lý báo giá, đơn bán và tích hợp xuất kho tự động.
          </p>
        </div>
        <Button onClick={() => setCreateSoOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Tạo Sales Order
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tổng đơn</CardTitle>
            <ShoppingCart className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi?.total_orders ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Gauge className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNum(kpi?.total_bookings ?? 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Revenue (Delivered)</CardTitle>
            <TrendingUp className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNum(kpi?.revenue_delivered ?? 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Quote Win Rate</CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{winRate}%</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="orders">Sales Orders</TabsTrigger>
          <TabsTrigger value="quotes">Báo giá</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
            <SelectTrigger className="w-60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
              {Object.entries(SALES_ORDER_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {loadingOrders ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Số SO</TableHead>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead className="text-right">Grand Total</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngày</TableHead>
                    <TableHead className="w-24">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(orders ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                        Chưa có SO nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    (orders ?? []).map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-sm">
                          {o.order_number}
                          {o.is_credit_bypassed && (
                            <Badge variant="destructive" className="ml-2 text-[10px]">
                              Bypass
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {o.customer?.name ?? o.customer_id}
                        </TableCell>
                        <TableCell className="text-right">{formatNum(o.grand_total)}</TableCell>
                        <TableCell>
                          <Badge variant={ORDER_STATUS_VARIANTS[o.status]}>
                            {SALES_ORDER_STATUS_LABELS[o.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(o.order_date).toLocaleDateString('vi-VN')}
                        </TableCell>
                        <TableCell>
                          {(o.status === 'CONFIRMED' || o.status === 'FULFILLING') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setCancelTarget(o)}
                              title="Hủy SO"
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="quotes" className="space-y-4">
          <Select value={quoteStatusFilter} onValueChange={setQuoteStatusFilter}>
            <SelectTrigger className="w-60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
              {Object.entries(QUOTE_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {loadingQuotes ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Số QT</TableHead>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead className="text-right">Grand Total</TableHead>
                    <TableHead>Hiệu lực</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="w-48">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(quotes ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                        Chưa có báo giá
                      </TableCell>
                    </TableRow>
                  ) : (
                    (quotes ?? []).map((q) => (
                      <TableRow key={q.id}>
                        <TableCell className="font-mono text-sm">{q.quote_number}</TableCell>
                        <TableCell className="font-medium">
                          {q.customer?.name ?? q.customer_id}
                        </TableCell>
                        <TableCell className="text-right">{formatNum(q.grand_total)}</TableCell>
                        <TableCell className="text-sm">
                          {q.effective_date} → {q.expiry_date}
                        </TableCell>
                        <TableCell>
                          <Badge variant={QUOTE_STATUS_VARIANTS[q.status]}>
                            {QUOTE_STATUS_LABELS[q.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {q.status === 'DRAFT' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleTransition(q, 'send')}
                              >
                                Gửi
                              </Button>
                            )}
                            {q.status === 'SENT' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleTransition(q, 'accept')}
                                >
                                  Accept
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleTransition(q, 'reject')}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreateSalesOrderDialog open={createSoOpen} onClose={() => setCreateSoOpen(false)} />

      <Dialog
        open={cancelTarget !== null}
        onOpenChange={(v) => {
          if (!v) {
            setCancelTarget(null)
            setCancelReason('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hủy Sales Order?</DialogTitle>
            <DialogDescription>
              <strong>{cancelTarget?.order_number}</strong> sẽ được đánh dấu CANCELED. Chỉ cho phép
              khi Outbound chưa PICKED.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">Lý do hủy *</Label>
            <Textarea
              id="reason"
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCancelTarget(null)
                setCancelReason('')
              }}
            >
              Hủy thao tác
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelMut.isPending}>
              {cancelMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xác nhận hủy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
