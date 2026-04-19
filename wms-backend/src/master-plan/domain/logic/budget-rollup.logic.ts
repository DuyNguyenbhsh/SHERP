// Pure function: validate sum(children_budget) ≤ parent_budget.
// Dùng bigint để tránh overflow với VND.

export function validateBudgetRollup(
  parentBudget: bigint,
  children: bigint[],
): { ok: boolean; childrenSum: bigint; excess: bigint } {
  const childrenSum = children.reduce((a, b) => a + b, 0n);
  const excess = childrenSum - parentBudget;
  return {
    ok: childrenSum <= parentBudget,
    childrenSum,
    excess: excess > 0n ? excess : 0n,
  };
}

// BR-MP-04: validate đệ quy toàn cây.
// Với mỗi parent (kể cả root → coi planBudget là parent): Σ(budget con) ≤ budget parent.
// Input: nodes đã lọc is_archived=false.
export interface WbsRollupNode {
  id: string;
  parent_id: string | null;
  budget_vnd: bigint;
  wbs_code: string;
}

export interface RollupViolation {
  // 'PLAN' cho violation ở gốc cây (Σroot > plan budget); các violation khác = node UUID
  parentId: string;
  parentCode: string;
  parentBudget: bigint;
  childrenSum: bigint;
  excess: bigint;
}

export function validateBudgetRollupTree(
  nodes: WbsRollupNode[],
  planBudget: bigint,
): { ok: boolean; violations: RollupViolation[] } {
  // Group children theo parent_id
  const childrenOf = new Map<string | null, WbsRollupNode[]>();
  for (const n of nodes) {
    const key = n.parent_id;
    const arr = childrenOf.get(key) ?? [];
    arr.push(n);
    childrenOf.set(key, arr);
  }

  const violations: RollupViolation[] = [];

  // Root (parent_id = null) so với plan budget
  const roots = childrenOf.get(null) ?? [];
  const rootSum = roots.reduce((a, r) => a + r.budget_vnd, 0n);
  if (rootSum > planBudget) {
    violations.push({
      parentId: 'PLAN',
      parentCode: 'PLAN',
      parentBudget: planBudget,
      childrenSum: rootSum,
      excess: rootSum - planBudget,
    });
  }

  // Mỗi node có con: Σ(budget con) ≤ budget node
  for (const n of nodes) {
    const kids = childrenOf.get(n.id);
    if (!kids || kids.length === 0) continue;
    const sum = kids.reduce((a, k) => a + k.budget_vnd, 0n);
    if (sum > n.budget_vnd) {
      violations.push({
        parentId: n.id,
        parentCode: n.wbs_code,
        parentBudget: n.budget_vnd,
        childrenSum: sum,
        excess: sum - n.budget_vnd,
      });
    }
  }

  return { ok: violations.length === 0, violations };
}
