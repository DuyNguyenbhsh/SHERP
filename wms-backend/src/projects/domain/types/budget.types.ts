/**
 * Domain types cho Budget & Cost Management.
 * Pure TypeScript — không phụ thuộc framework.
 */

export interface BudgetRow {
  category_id: string;
  code: string;
  name: string;
  planned: number;
}

export interface ActualCostRow {
  category_id: string;
  code: string;
  name: string;
  total: number;
  count: number;
}

export interface CostBreakdownItem {
  category_id: string;
  code: string;
  name: string;
  planned: number;
  actual: number;
  count: number;
}

export interface CostSummaryResult {
  total_budget: number;
  total_actual: number;
  remaining: number;
  variance_percent: number;
  breakdown: CostBreakdownItem[];
}

// ── Hard Limit Budget Check Types ──

export interface BudgetSnapshot {
  budget_id: string;
  planned_amount: number;
  consumed_amount: number;
  committed_amount: number;
  control_level: 'HARD' | 'SOFT' | 'ADVISORY';
  warning_threshold_pct: number;
}

export interface BudgetCheckRequest {
  amount: number;
  amount_type: 'COMMITTED' | 'CONSUMED';
}

export interface BudgetCheckOutput {
  check_result: 'APPROVED' | 'REJECTED';
  available_before: number;
  available_after: number;
  warning?: string;
  rejection_reason?: string;
}
