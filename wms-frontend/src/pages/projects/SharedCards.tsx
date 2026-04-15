import { Loader2 } from 'lucide-react'

export interface InfoRowProps {
  icon: React.ReactNode
  label: string
  value: string | null | undefined
}

export function InfoRow({ icon, label, value }: InfoRowProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800">{value ?? '—'}</p>
      </div>
    </div>
  )
}

export interface SummaryCardProps {
  label: string
  value: string
  loading: boolean
  accent?: 'red' | 'green'
}

export function SummaryCard({
  label,
  value,
  loading,
  accent,
}: SummaryCardProps): React.JSX.Element {
  return (
    <div
      className={`rounded-lg border p-4 ${accent === 'red' ? 'border-red-200 bg-red-50/50' : accent === 'green' ? 'border-green-200 bg-green-50/50' : 'bg-card'}`}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {loading ? (
        <Loader2 className="mt-2 h-5 w-5 animate-spin text-muted-foreground" />
      ) : (
        <p
          className={`mt-1 text-xl font-bold ${accent === 'red' ? 'text-red-600' : accent === 'green' ? 'text-green-600' : ''}`}
        >
          {value}
        </p>
      )}
    </div>
  )
}

export interface QuickStatProps {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  accent?: 'red'
}

export function QuickStat({ icon, label, value, sub, accent }: QuickStatProps): React.JSX.Element {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
      <p
        className={`text-xs mt-0.5 ${accent === 'red' ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}
      >
        {sub}
      </p>
    </div>
  )
}
