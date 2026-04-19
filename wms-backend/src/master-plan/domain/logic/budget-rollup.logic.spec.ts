import {
  validateBudgetRollup,
  validateBudgetRollupTree,
  type WbsRollupNode,
} from './budget-rollup.logic';

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

describe('validateBudgetRollupTree', () => {
  const mkNode = (
    id: string,
    parent_id: string | null,
    budget: bigint,
    code = id,
  ): WbsRollupNode => ({ id, parent_id, budget_vnd: budget, wbs_code: code });

  it('cây rỗng thì ok dù plan budget = 0', () => {
    const res = validateBudgetRollupTree([], 0n);
    expect(res.ok).toBe(true);
    expect(res.violations).toEqual([]);
  });

  it('chỉ root, Σ(root) ≤ plan → ok', () => {
    const res = validateBudgetRollupTree(
      [mkNode('a', null, 400n), mkNode('b', null, 500n)],
      1000n,
    );
    expect(res.ok).toBe(true);
  });

  it('chỉ root, Σ(root) > plan → violation PLAN', () => {
    const res = validateBudgetRollupTree(
      [mkNode('a', null, 700n), mkNode('b', null, 500n)],
      1000n,
    );
    expect(res.ok).toBe(false);
    expect(res.violations).toHaveLength(1);
    expect(res.violations[0].parentId).toBe('PLAN');
    expect(res.violations[0].excess).toBe(200n);
  });

  it('con vượt cha ở mức sâu → detect đúng parent', () => {
    // root a=1000 > Σcon=800 (ok); con c=500 < Σcháu=600 (violation)
    const res = validateBudgetRollupTree(
      [
        mkNode('a', null, 1000n),
        mkNode('b', 'a', 300n),
        mkNode('c', 'a', 500n),
        mkNode('d', 'c', 400n),
        mkNode('e', 'c', 200n),
      ],
      2000n,
    );
    expect(res.ok).toBe(false);
    expect(res.violations).toHaveLength(1);
    expect(res.violations[0].parentId).toBe('c');
    expect(res.violations[0].excess).toBe(100n);
  });

  it('nhiều violation cùng lúc', () => {
    const res = validateBudgetRollupTree(
      [
        mkNode('a', null, 100n),
        mkNode('b', 'a', 200n), // con > cha
      ],
      50n, // root sum (100) > plan (50)
    );
    expect(res.ok).toBe(false);
    expect(res.violations).toHaveLength(2);
  });

  it('node lá (không con) không tạo violation', () => {
    const res = validateBudgetRollupTree(
      [mkNode('a', null, 100n), mkNode('b', 'a', 50n)],
      1000n,
    );
    expect(res.ok).toBe(true);
  });
});
