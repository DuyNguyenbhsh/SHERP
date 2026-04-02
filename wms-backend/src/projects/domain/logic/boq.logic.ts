/**
 * BOQ Threshold & Settlement Calculation — Pure domain logic.
 */

import type {
  BoqThresholdInput,
  BoqThresholdResult,
  SettlementLineCalc,
  SettlementTotals,
} from '../types';

/**
 * Kiểm tra định mức BOQ: liệu lượng xuất thêm có vượt định mức không.
 */
export function checkBoqThreshold(
  boq: BoqThresholdInput,
  requestedQty: number,
): BoqThresholdResult {
  const quantity = Number(boq.quantity);
  const issuedQty = Number(boq.issued_qty);
  const totalAfterIssue = issuedQty + requestedQty;
  const remaining = quantity - issuedQty;
  const usagePercent =
    quantity > 0 ? Math.round((totalAfterIssue / quantity) * 100) : 0;

  return {
    exceeded: totalAfterIssue > quantity,
    remaining,
    usage_percent: usagePercent,
  };
}

/**
 * Tính toán settlement line từ BOQ data + input qty_on_site.
 */
export function calculateSettlementLine(
  boqIssued: number,
  boqUnitPrice: number,
  qtyOnSite: number,
  qtyReturned: number = 0,
): { qty_variance: number; value_variance: number } {
  const qtyVariance = boqIssued - qtyReturned - qtyOnSite;
  const valueVariance = qtyVariance * boqUnitPrice;
  return { qty_variance: qtyVariance, value_variance: valueVariance };
}

/**
 * Tính tổng settlement totals từ danh sách line items.
 */
export function calculateSettlementTotals(
  lines: SettlementLineCalc[],
): SettlementTotals {
  const totalIn = lines.reduce((s, l) => s + l.qty_issued * l.unit_price, 0);
  const totalOut = lines.reduce((s, l) => s + l.qty_returned * l.unit_price, 0);
  const onSiteValue = lines.reduce(
    (s, l) => s + l.qty_on_site * l.unit_price,
    0,
  );
  const variance = totalIn - totalOut - onSiteValue;
  const variancePercent =
    totalIn > 0 ? Math.round((variance / totalIn) * 10000) / 100 : 0;

  return {
    total_material_in: totalIn,
    total_material_out: totalOut,
    on_site_stock_value: onSiteValue,
    variance,
    variance_percent: variancePercent,
  };
}
