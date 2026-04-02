/**
 * Budget Variance — Pure domain logic.
 * Tính toán chênh lệch ngân sách vs chi phí thực tế.
 */

import type { BudgetRow, ActualCostRow, CostSummaryResult } from '../types';

export function calculateCostSummary(
  budgetRows: BudgetRow[],
  actualRows: ActualCostRow[],
): CostSummaryResult {
  const categoryMap = new Map<
    string,
    {
      category_id: string;
      code: string;
      name: string;
      planned: number;
      actual: number;
      count: number;
    }
  >();

  for (const b of budgetRows) {
    categoryMap.set(b.category_id, {
      category_id: b.category_id,
      code: b.code,
      name: b.name,
      planned: b.planned,
      actual: 0,
      count: 0,
    });
  }

  for (const a of actualRows) {
    const existing = categoryMap.get(a.category_id);
    if (existing) {
      existing.actual = a.total;
      existing.count = a.count;
    } else {
      categoryMap.set(a.category_id, {
        category_id: a.category_id,
        code: a.code,
        name: a.name,
        planned: 0,
        actual: a.total,
        count: a.count,
      });
    }
  }

  const breakdown = Array.from(categoryMap.values()).sort(
    (a, b) => b.actual - a.actual,
  );
  const totalBudget = breakdown.reduce((s, r) => s + r.planned, 0);
  const totalActual = breakdown.reduce((s, r) => s + r.actual, 0);
  const remaining = totalBudget - totalActual;
  const variance =
    totalBudget > 0
      ? Math.round(((totalActual - totalBudget) / totalBudget) * 10000) / 100
      : 0;

  return {
    total_budget: totalBudget,
    total_actual: totalActual,
    remaining,
    variance_percent: variance,
    breakdown,
  };
}
