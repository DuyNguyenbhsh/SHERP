/**
 * Budget Variance — Pure domain logic.
 * Tính toán chênh lệch ngân sách vs chi phí thực tế.
 */

import type {
  BudgetRow,
  ActualCostRow,
  CostSummaryResult,
  BudgetSnapshot,
  BudgetCheckRequest,
  BudgetCheckOutput,
} from '../types';

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

/**
 * checkHardLimit — Pure function kiểm tra ngân sách theo control_level.
 *
 * - ADVISORY: luôn APPROVED (chỉ log cảnh báo nếu gần/vượt threshold)
 * - SOFT: luôn APPROVED + warning nếu vượt
 * - HARD: REJECTED nếu vượt planned_amount
 */
export function checkHardLimit(
  snapshot: BudgetSnapshot,
  request: BudgetCheckRequest,
): BudgetCheckOutput {
  const totalUsed = snapshot.consumed_amount + snapshot.committed_amount;
  const available = snapshot.planned_amount - totalUsed;
  const availableAfter = available - request.amount;
  const thresholdAmount =
    (snapshot.planned_amount * snapshot.warning_threshold_pct) / 100;

  const base: Pick<BudgetCheckOutput, 'available_before' | 'available_after'> =
    {
      available_before: available,
      available_after: availableAfter,
    };

  // Cảnh báo khi đạt threshold (áp dụng cho mọi control_level)
  const nearThreshold =
    snapshot.planned_amount > 0 &&
    totalUsed + request.amount >= thresholdAmount;
  const warning = nearThreshold
    ? `Đã sử dụng ${Math.round(((totalUsed + request.amount) / snapshot.planned_amount) * 100)}% ngân sách (ngưỡng cảnh báo: ${snapshot.warning_threshold_pct}%)`
    : undefined;

  // ADVISORY: luôn duyệt
  if (snapshot.control_level === 'ADVISORY') {
    return { ...base, check_result: 'APPROVED', warning };
  }

  // SOFT: luôn duyệt nhưng cảnh báo nếu vượt
  if (snapshot.control_level === 'SOFT') {
    const softWarning =
      availableAfter < 0
        ? `Vượt ngân sách ${Math.abs(availableAfter).toLocaleString('vi-VN')} VNĐ (SOFT — cho phép nhưng cần review)`
        : warning;
    return { ...base, check_result: 'APPROVED', warning: softWarning };
  }

  // HARD: từ chối nếu vượt
  if (availableAfter < 0) {
    return {
      ...base,
      check_result: 'REJECTED',
      rejection_reason: `Vượt ngân sách! Khả dụng: ${available.toLocaleString('vi-VN')} VNĐ, yêu cầu: ${request.amount.toLocaleString('vi-VN')} VNĐ. Vượt: ${Math.abs(availableAfter).toLocaleString('vi-VN')} VNĐ.`,
    };
  }

  return { ...base, check_result: 'APPROVED', warning };
}
