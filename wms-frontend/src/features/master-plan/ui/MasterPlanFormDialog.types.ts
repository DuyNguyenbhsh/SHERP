export interface MasterPlanFormState {
  code: string
  name: string
  year: number
  project_id: string
  budget_vnd: string
  start_date: string
  end_date: string
}

/**
 * Format a BigInt-safe VND string for display. Uses Intl.NumberFormat
 * with Vietnamese locale grouping. Falls back to raw value on parse error.
 */
export function formatVndBigint(value: string): string {
  try {
    return new Intl.NumberFormat('vi-VN').format(BigInt(value))
  } catch {
    return value
  }
}
