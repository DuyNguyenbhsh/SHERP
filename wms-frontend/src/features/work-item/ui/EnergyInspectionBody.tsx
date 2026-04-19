import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useEnergyInspection,
  useRecordReading,
  useEnergyMeters,
  METER_TYPE_LABELS,
} from '@/entities/energy-inspection'
import { getErrorMessage } from '@/shared/api/axios'

export function EnergyInspectionBody({
  inspectionId,
}: {
  inspectionId: string
}): React.JSX.Element {
  const { data: inspection, isLoading } = useEnergyInspection(inspectionId)
  const { data: allMeters } = useEnergyMeters(
    inspection ? { projectId: inspection.project_id } : {},
  )
  const recordMut = useRecordReading(inspectionId)
  const [values, setValues] = useState<Record<string, string>>({})

  if (isLoading || !inspection) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  const meterMap = new Map(allMeters?.map((m) => [m.id, m]))
  const readingByMeter = new Map(inspection.readings.map((r) => [r.meter_id, r]))
  const readonly = inspection.status === 'COMPLETED'

  const submit = (meterId: string): void => {
    const value = values[meterId]
    if (!value) {
      toast.error('Nhập giá trị đồng hồ')
      return
    }
    recordMut.mutate(
      { meter_id: meterId, value },
      {
        onSuccess: () => {
          toast.success('Đã ghi reading')
          setValues((prev) => ({ ...prev, [meterId]: '' }))
        },
        onError: (err) => toast.error(getErrorMessage(err, 'Ghi reading thất bại')),
      },
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Inspection ngày {inspection.inspection_date}</span>
            <Badge variant={readonly ? 'default' : 'outline'}>{inspection.status}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {inspection.readings.length} / {inspection.required_meter_ids.length} meters đã đọc
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã meter</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead className="text-right">Giá trị trước</TableHead>
              <TableHead>Giá trị mới</TableHead>
              <TableHead className="text-right">Delta</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inspection.required_meter_ids.map((mid) => {
              const meter = meterMap.get(mid)
              const reading = readingByMeter.get(mid)
              return (
                <TableRow key={mid}>
                  <TableCell className="font-mono text-sm">
                    {meter?.code ?? mid.slice(0, 8)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {meter?.meter_type ? METER_TYPE_LABELS[meter.meter_type] : '—'}
                    </Badge>{' '}
                    {meter?.unit}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {reading?.previous_value ?? '—'}
                  </TableCell>
                  <TableCell>
                    {reading ? (
                      <span className="font-medium tabular-nums">{reading.value}</span>
                    ) : (
                      <Input
                        disabled={readonly}
                        value={values[mid] ?? ''}
                        onChange={(e) => setValues((prev) => ({ ...prev, [mid]: e.target.value }))}
                        placeholder="0.0000"
                        className="max-w-32"
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{reading?.delta ?? '—'}</TableCell>
                  <TableCell>
                    {!reading && !readonly && (
                      <Button size="sm" onClick={() => submit(mid)} disabled={recordMut.isPending}>
                        Ghi
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
