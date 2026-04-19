import { useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useEnergyMeters, METER_TYPE_LABELS } from '@/entities/energy-inspection'
import { CreateMeterDialog } from '@/features/energy-inspection/ui/CreateMeterDialog'
import { useAuthStore } from '@/features/auth/model/auth.store'

export function EnergyMetersPage(): React.JSX.Element {
  const canManage = useAuthStore((s) => s.hasPrivilege('MANAGE_ENERGY_METER'))
  const [projectId, setProjectId] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const { data, isLoading } = useEnergyMeters({
    projectId: projectId || undefined,
    active: true,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Đồng hồ điện / nước / gas</h1>
          <p className="text-sm text-muted-foreground">
            Master-data đồng hồ đo tiêu thụ — dùng trong Energy Inspection
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Đăng ký Meter
          </Button>
        )}
      </div>

      <Input
        placeholder="Filter Project UUID (để trống = tất cả)"
        value={projectId}
        onChange={(e) => setProjectId(e.target.value)}
        className="max-w-md"
      />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã</TableHead>
              <TableHead>Tên</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Đơn vị</TableHead>
              <TableHead>Vị trí</TableHead>
              <TableHead>Cumulative</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            )}
            {!isLoading && (data?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Không có meter
                </TableCell>
              </TableRow>
            )}
            {data?.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-mono text-sm">{m.code}</TableCell>
                <TableCell>{m.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{METER_TYPE_LABELS[m.meter_type]}</Badge>
                </TableCell>
                <TableCell>{m.unit}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {m.location_text ?? '—'}
                </TableCell>
                <TableCell>
                  {m.is_cumulative ? (
                    <Badge variant="default">Tổng</Badge>
                  ) : (
                    <Badge variant="secondary">Chênh lệch</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <CreateMeterDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        defaultProjectId={projectId || undefined}
      />
    </div>
  )
}
