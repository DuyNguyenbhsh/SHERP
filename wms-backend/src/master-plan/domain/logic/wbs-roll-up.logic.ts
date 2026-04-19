// Pure function: progress_pct = completed / total × 100 (round half-up).
// Input: counts mảng { completed, total } theo node con.

export interface WbsCounts {
  completed: number;
  total: number;
}

export function rollUpProgress(children: WbsCounts[]): number {
  const sum = children.reduce(
    (acc, c) => ({
      completed: acc.completed + c.completed,
      total: acc.total + c.total,
    }),
    { completed: 0, total: 0 },
  );
  if (sum.total === 0) return 0;
  return Math.round((sum.completed / sum.total) * 100);
}
