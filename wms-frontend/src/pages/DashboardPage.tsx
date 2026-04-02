import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LayoutDashboard } from 'lucide-react'

const cards = [
  { key: 'inbound', label: 'Nhập kho' },
  { key: 'inventory', label: 'Tồn kho' },
  { key: 'outbound', label: 'Xuất kho' },
  { key: 'orders', label: 'Đơn hàng' },
] as const

export function DashboardPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Tổng quan</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.key}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Đang chờ triển khai</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
