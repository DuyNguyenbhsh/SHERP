import { validateBudgetRollup } from './budget-rollup.logic';

describe('validateBudgetRollup', () => {
  it('trả về ok=true khi tổng con bằng parent', () => {
    const res = validateBudgetRollup(1000n, [600n, 400n]);
    expect(res.ok).toBe(true);
    expect(res.childrenSum).toBe(1000n);
    expect(res.excess).toBe(0n);
  });

  it('trả về ok=true khi tổng con < parent', () => {
    const res = validateBudgetRollup(1000n, [300n, 200n]);
    expect(res.ok).toBe(true);
    expect(res.childrenSum).toBe(500n);
    expect(res.excess).toBe(0n);
  });

  it('trả về ok=false kèm excess khi tổng con > parent', () => {
    const res = validateBudgetRollup(1000n, [600n, 500n]);
    expect(res.ok).toBe(false);
    expect(res.childrenSum).toBe(1100n);
    expect(res.excess).toBe(100n);
  });

  it('xử lý mảng rỗng: ok=true, sum=0', () => {
    const res = validateBudgetRollup(1000n, []);
    expect(res.ok).toBe(true);
    expect(res.childrenSum).toBe(0n);
    expect(res.excess).toBe(0n);
  });

  it('xử lý parent=0: chỉ ok nếu không có con', () => {
    expect(validateBudgetRollup(0n, []).ok).toBe(true);
    expect(validateBudgetRollup(0n, [1n]).ok).toBe(false);
  });

  it('xử lý VND lớn (10^12) không tràn số', () => {
    const parent = 1_250_000_000_000n;
    const children = [500_000_000_000n, 500_000_000_000n, 250_000_000_000n];
    const res = validateBudgetRollup(parent, children);
    expect(res.ok).toBe(true);
    expect(res.childrenSum).toBe(parent);
  });
});
