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
