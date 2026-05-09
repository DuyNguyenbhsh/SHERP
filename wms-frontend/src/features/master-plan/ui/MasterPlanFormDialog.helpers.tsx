import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ProjectPicker } from '@/entities/project'
import { PROJECT_LOOKUP_STRINGS as S } from '@/features/master-plan/constants/project-lookup.strings'
import { formatVndBigint, type MasterPlanFormState } from './MasterPlanFormDialog.types'

interface BudgetWarningBannerProps {
  headroom: string
}

/**
 * Soft budget warning banner surfaced after POST /master-plan returns
 * { warning: true, headroom }. Non-blocking; user acks via dialog footer.
 */
export function BudgetWarningBanner({ headroom }: BudgetWarningBannerProps): React.JSX.Element {
  return (
    <Alert className="bg-warning/10 border-warning text-warning-foreground">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{S.BUDGET_WARNING_TITLE}</AlertTitle>
      <AlertDescription>
        {S.BUDGET_WARNING_BODY(formatVndBigint(headroom))}
        <p className="mt-2 text-sm">{S.BUDGET_WARNING_SAVED_NOTICE}</p>
      </AlertDescription>
    </Alert>
  )
}

interface FormFieldsProps {
  form: MasterPlanFormState
  setForm: (next: MasterPlanFormState) => void
  includeInactive: boolean
  setIncludeInactive: (v: boolean) => void
  pending: boolean
}

export function MasterPlanFormFields({
  form,
  setForm,
  includeInactive,
  setIncludeInactive,
  pending,
}: FormFieldsProps): React.JSX.Element {
  const row = 'grid grid-cols-3 items-center gap-3'
  return (
    <>
      <div className={row}>
        <Label htmlFor="mp-code">Mã *</Label>
        <Input
          id="mp-code"
          className="col-span-2"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          placeholder="MP-2026-TOWER-A"
        />
      </div>
      <div className={row}>
        <Label htmlFor="mp-name">Tên *</Label>
        <Input
          id="mp-name"
          className="col-span-2"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>
      <div className={row}>
        <Label htmlFor="mp-year">Năm *</Label>
        <Input
          id="mp-year"
          type="number"
          className="col-span-2"
          value={form.year}
          onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
        />
      </div>
      <div className={row}>
        <Label htmlFor="mp-project">{S.LABEL_PROJECT_REQUIRED}</Label>
        <div className="col-span-2 space-y-2">
          <ProjectPicker
            id="mp-project"
            value={form.project_id || null}
            onChange={(id) => setForm({ ...form, project_id: id ?? '' })}
            includeInactive={includeInactive}
            disabled={pending}
          />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
            />
            {S.TOGGLE_INCLUDE_INACTIVE}
          </label>
        </div>
      </div>
      <div className={row}>
        <Label htmlFor="mp-budget">Ngân sách (VND)</Label>
        <Input
          id="mp-budget"
          className="col-span-2"
          value={form.budget_vnd}
          onChange={(e) => setForm({ ...form, budget_vnd: e.target.value })}
          placeholder="1250000000"
        />
      </div>
      <div className={row}>
        <Label htmlFor="mp-start">Ngày bắt đầu</Label>
        <Input
          id="mp-start"
          type="date"
          className="col-span-2"
          value={form.start_date}
          onChange={(e) => setForm({ ...form, start_date: e.target.value })}
        />
      </div>
      <div className={row}>
        <Label htmlFor="mp-end">Ngày kết thúc</Label>
        <Input
          id="mp-end"
          type="date"
          className="col-span-2"
          value={form.end_date}
          onChange={(e) => setForm({ ...form, end_date: e.target.value })}
        />
      </div>
    </>
  )
}
