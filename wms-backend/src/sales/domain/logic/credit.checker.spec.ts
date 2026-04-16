import { checkCredit } from './credit.checker';

describe('CreditChecker', () => {
  it('Allow khi debt + new <= limit', () => {
    const r = checkCredit({
      current_debt: 30_000_000,
      credit_limit: 100_000_000,
      new_order_amount: 50_000_000,
      has_bypass_privilege: false,
    });
    expect(r.allowed).toBe(true);
    expect(r.shortfall).toBe(0);
    expect(r.requires_bypass).toBe(false);
  });

  it('Block khi vượt hạn mức + user không có bypass', () => {
    const r = checkCredit({
      current_debt: 90_000_000,
      credit_limit: 100_000_000,
      new_order_amount: 20_000_000,
      has_bypass_privilege: false,
    });
    expect(r.allowed).toBe(false);
    expect(r.shortfall).toBe(10_000_000);
    expect(r.requires_bypass).toBe(false);
  });

  it('Bypass user không có reason → vẫn block + requires_bypass=true', () => {
    const r = checkCredit({
      current_debt: 90_000_000,
      credit_limit: 100_000_000,
      new_order_amount: 20_000_000,
      has_bypass_privilege: true,
    });
    expect(r.allowed).toBe(false);
    expect(r.requires_bypass).toBe(true);
    expect(r.message).toContain('Bắt buộc nhập lý do');
  });

  it('Bypass với reason hợp lệ → allowed + requires_bypass=true', () => {
    const r = checkCredit({
      current_debt: 90_000_000,
      credit_limit: 100_000_000,
      new_order_amount: 20_000_000,
      has_bypass_privilege: true,
      bypass_reason: 'Khách VIP, lịch sử thanh toán tốt',
    });
    expect(r.allowed).toBe(true);
    expect(r.requires_bypass).toBe(true);
    expect(r.shortfall).toBe(10_000_000);
  });

  it('Edge: limit = 0, debt = 0, new = 1 → shortfall = 1', () => {
    const r = checkCredit({
      current_debt: 0,
      credit_limit: 0,
      new_order_amount: 1,
      has_bypass_privilege: false,
    });
    expect(r.shortfall).toBe(1);
    expect(r.allowed).toBe(false);
  });

  it('Edge: exact match limit → allowed', () => {
    const r = checkCredit({
      current_debt: 60_000_000,
      credit_limit: 100_000_000,
      new_order_amount: 40_000_000,
      has_bypass_privilege: false,
    });
    expect(r.allowed).toBe(true);
    expect(r.shortfall).toBe(0);
  });
});
