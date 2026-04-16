import { calculateLine, calculateQuote } from './pricing.calculator';

describe('PricingCalculator', () => {
  describe('calculateLine', () => {
    it('qty × unit_price cơ bản (no discount, no tax)', () => {
      const r = calculateLine({ qty: 10, unit_price: 1000 });
      expect(r.line_subtotal).toBe(10000);
      expect(r.line_discount).toBe(0);
      expect(r.line_tax).toBe(0);
      expect(r.line_total).toBe(10000);
    });

    it('VAT 10% mặc định khi không pass tax_percent', () => {
      const r = calculateLine({
        qty: 1,
        unit_price: 1000,
        tax_percent: 10,
      });
      expect(r.line_tax).toBe(100);
      expect(r.line_total).toBe(1100);
    });

    it('Discount 10% + Tax 10% — tax tính SAU discount (BR-SALES-03)', () => {
      const r = calculateLine({
        qty: 2,
        unit_price: 1000,
        discount_percent: 10,
        tax_percent: 10,
      });
      // subtotal=2000, discount=200, after=1800, tax=180, total=1980
      expect(r.line_subtotal).toBe(2000);
      expect(r.line_discount).toBe(200);
      expect(r.line_tax).toBe(180);
      expect(r.line_total).toBe(1980);
    });

    it('Clamp discount 0-100 khi input âm/vượt', () => {
      const r1 = calculateLine({
        qty: 1,
        unit_price: 1000,
        discount_percent: -5,
      });
      expect(r1.line_discount).toBe(0);

      const r2 = calculateLine({
        qty: 1,
        unit_price: 1000,
        discount_percent: 150,
      });
      // Clamp to 100% → fully discounted
      expect(r2.line_discount).toBe(1000);
    });

    it('Throw khi qty hoặc unit_price âm', () => {
      expect(() => calculateLine({ qty: -1, unit_price: 1000 })).toThrow(
        /qty phải >= 0/,
      );
      expect(() => calculateLine({ qty: 1, unit_price: -100 })).toThrow(
        /unit_price phải >= 0/,
      );
    });

    it('Round nửa trên (VND)', () => {
      const r = calculateLine({
        qty: 3,
        unit_price: 333.333,
        tax_percent: 10,
      });
      // subtotal=999.999 → 1000 rounded
      expect(r.line_subtotal).toBe(1000);
    });
  });

  describe('calculateQuote', () => {
    it('Sum đúng với nhiều lines', () => {
      const totals = calculateQuote([
        {
          line_subtotal: 10000,
          line_discount: 1000,
          line_tax: 900,
          line_total: 9900,
        },
        {
          line_subtotal: 5000,
          line_discount: 0,
          line_tax: 500,
          line_total: 5500,
        },
      ]);
      expect(totals.total_subtotal).toBe(15000);
      expect(totals.total_discount).toBe(1000);
      expect(totals.total_tax).toBe(1400);
      expect(totals.grand_total).toBe(15400);
    });

    it('Empty lines → all zeros', () => {
      const totals = calculateQuote([]);
      expect(totals).toEqual({
        total_subtotal: 0,
        total_discount: 0,
        total_tax: 0,
        grand_total: 0,
      });
    });
  });
});
