/**
 * PricingCalculator — Pure functions tính line và header totals.
 *
 * Business Rules:
 * - BR-SALES-02: line_discount = subtotal * discount_pct / 100
 * - BR-SALES-03: line_tax tính SAU discount: (subtotal - discount) * tax% / 100
 * - Round 0 decimal (VND không có phần lẻ)
 */

export interface LineInput {
  qty: number;
  unit_price: number;
  discount_percent?: number;
  tax_percent?: number;
}

export interface LineBreakdown {
  line_subtotal: number;
  line_discount: number;
  line_tax: number;
  line_total: number;
}

export interface QuoteBreakdown {
  total_subtotal: number;
  total_discount: number;
  total_tax: number;
  grand_total: number;
}

const round = (n: number): number => Math.round(n);

export function calculateLine(input: LineInput): LineBreakdown {
  if (input.qty < 0) throw new Error('qty phải >= 0');
  if (input.unit_price < 0) throw new Error('unit_price phải >= 0');

  const discountPct = Math.max(0, Math.min(100, input.discount_percent ?? 0));
  const taxPct = Math.max(0, Math.min(100, input.tax_percent ?? 0));

  const subtotal = input.qty * input.unit_price;
  const discount = (subtotal * discountPct) / 100;
  const afterDiscount = subtotal - discount;
  const tax = (afterDiscount * taxPct) / 100;
  const total = afterDiscount + tax;

  return {
    line_subtotal: round(subtotal),
    line_discount: round(discount),
    line_tax: round(tax),
    line_total: round(total),
  };
}

export function calculateQuote(lines: LineBreakdown[]): QuoteBreakdown {
  const total_subtotal = lines.reduce((s, l) => s + l.line_subtotal, 0);
  const total_discount = lines.reduce((s, l) => s + l.line_discount, 0);
  const total_tax = lines.reduce((s, l) => s + l.line_tax, 0);
  const grand_total = total_subtotal - total_discount + total_tax;

  return {
    total_subtotal: round(total_subtotal),
    total_discount: round(total_discount),
    total_tax: round(total_tax),
    grand_total: round(grand_total),
  };
}
