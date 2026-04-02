export interface BudgetVarianceRow {
  project_code: string
  project_name: string
  reporting_year: number
  reporting_month: number
  opening_budget: number
  closing_budget: number
  variance_amount: number
  variance_percentage: number
}

export interface BudgetVarianceQuery {
  project_id?: string
  year?: number
}
