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
