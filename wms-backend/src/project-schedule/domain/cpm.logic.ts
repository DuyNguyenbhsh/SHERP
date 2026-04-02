/**
 * Critical Path Method (CPM) — Pure domain logic.
 * Không phụ thuộc NestJS, TypeORM.
 *
 * Thuật toán:
 * 1. Topological Sort (kiểm tra cycle)
 * 2. Forward Pass: ES, EF cho từng task
 * 3. Backward Pass: LS, LF cho từng task
 * 4. Total Float = LS - ES. Float = 0 → Critical Path
 */

export interface CpmTask {
  id: string;
  duration_days: number;
  // Computed:
  early_start: number;
  early_finish: number;
  late_start: number;
  late_finish: number;
  total_float: number;
  is_critical: boolean;
}

export interface CpmLink {
  predecessor_id: string;
  successor_id: string;
  lag_days: number;
}

export interface CpmResult {
  tasks: Map<string, CpmTask>;
  critical_path_ids: string[];
  project_duration: number;
}

/**
 * Phát hiện vòng lặp (Cycle Detection) bằng DFS.
 * Trả về null nếu không có cycle, hoặc mảng IDs tạo thành cycle.
 */
export function detectCycle(
  taskIds: string[],
  links: CpmLink[],
): string[] | null {
  const adj = new Map<string, string[]>();
  for (const id of taskIds) adj.set(id, []);
  for (const link of links) {
    adj.get(link.predecessor_id)?.push(link.successor_id);
  }

  const WHITE = 0,
    GRAY = 1,
    BLACK = 2;
  const color = new Map<string, number>();
  for (const id of taskIds) color.set(id, WHITE);

  const parent = new Map<string, string | null>();
  let cycleNodes: string[] | null = null;

  function dfs(u: string): boolean {
    color.set(u, GRAY);
    for (const v of adj.get(u) ?? []) {
      if (color.get(v) === GRAY) {
        // Tìm thấy cycle: trace back
        const cycle = [v, u];
        let cur = u;
        while (cur !== v && parent.get(cur)) {
          cur = parent.get(cur)!;
          cycle.push(cur);
        }
        cycleNodes = cycle.reverse();
        return true;
      }
      if (color.get(v) === WHITE) {
        parent.set(v, u);
        if (dfs(v)) return true;
      }
    }
    color.set(u, BLACK);
    return false;
  }

  for (const id of taskIds) {
    if (color.get(id) === WHITE) {
      parent.set(id, null);
      if (dfs(id)) return cycleNodes;
    }
  }

  return null;
}

/**
 * Topological Sort (Kahn's Algorithm).
 * Throws nếu có cycle.
 */
function topologicalSort(taskIds: string[], links: CpmLink[]): string[] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const id of taskIds) {
    inDegree.set(id, 0);
    adj.set(id, []);
  }

  for (const link of links) {
    adj.get(link.predecessor_id)?.push(link.successor_id);
    inDegree.set(link.successor_id, (inDegree.get(link.successor_id) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const u = queue.shift()!;
    sorted.push(u);
    for (const v of adj.get(u) ?? []) {
      const newDeg = (inDegree.get(v) ?? 1) - 1;
      inDegree.set(v, newDeg);
      if (newDeg === 0) queue.push(v);
    }
  }

  if (sorted.length !== taskIds.length) {
    throw new Error(
      'Phát hiện vòng lặp trong mối quan hệ task! Không thể tính lịch trình.',
    );
  }

  return sorted;
}

/**
 * Tính CPM (Critical Path Method).
 *
 * Input: danh sách tasks (id + duration) và links (predecessor → successor + lag)
 * Output: ES, EF, LS, LF, Total Float, is_critical cho từng task
 */
export function calculateCPM(
  tasks: { id: string; duration_days: number }[],
  links: CpmLink[],
): CpmResult {
  const taskIds = tasks.map((t) => t.id);
  const sorted = topologicalSort(taskIds, links);

  // Build maps
  const durationMap = new Map<string, number>();
  for (const t of tasks) durationMap.set(t.id, t.duration_days);

  // Adjacency: predecessor → [{successor, lag}]
  const successors = new Map<string, { id: string; lag: number }[]>();
  const predecessors = new Map<string, { id: string; lag: number }[]>();
  for (const id of taskIds) {
    successors.set(id, []);
    predecessors.set(id, []);
  }
  for (const link of links) {
    successors
      .get(link.predecessor_id)
      ?.push({ id: link.successor_id, lag: link.lag_days });
    predecessors
      .get(link.successor_id)
      ?.push({ id: link.predecessor_id, lag: link.lag_days });
  }

  // ── FORWARD PASS: Tính ES, EF ──
  const es = new Map<string, number>();
  const ef = new Map<string, number>();

  for (const id of sorted) {
    const preds = predecessors.get(id) ?? [];
    let maxPredEnd = 0;
    for (const pred of preds) {
      const predEF = ef.get(pred.id) ?? 0;
      maxPredEnd = Math.max(maxPredEnd, predEF + pred.lag);
    }
    es.set(id, maxPredEnd);
    ef.set(id, maxPredEnd + (durationMap.get(id) ?? 0));
  }

  // Project duration = max(EF)
  let projectDuration = 0;
  for (const val of ef.values()) {
    projectDuration = Math.max(projectDuration, val);
  }

  // ── BACKWARD PASS: Tính LS, LF ──
  const ls = new Map<string, number>();
  const lf = new Map<string, number>();

  // Reverse order
  const reverseSorted = [...sorted].reverse();

  for (const id of reverseSorted) {
    const succs = successors.get(id) ?? [];
    if (succs.length === 0) {
      // No successors → LF = project duration
      lf.set(id, projectDuration);
    } else {
      let minSuccStart = Infinity;
      for (const succ of succs) {
        const succLS = ls.get(succ.id) ?? projectDuration;
        minSuccStart = Math.min(minSuccStart, succLS - succ.lag);
      }
      lf.set(id, minSuccStart);
    }
    ls.set(id, (lf.get(id) ?? 0) - (durationMap.get(id) ?? 0));
  }

  // ── Calculate Float & Critical Path ──
  const result = new Map<string, CpmTask>();
  const criticalIds: string[] = [];

  for (const t of tasks) {
    const esVal = es.get(t.id) ?? 0;
    const efVal = ef.get(t.id) ?? 0;
    const lsVal = ls.get(t.id) ?? 0;
    const lfVal = lf.get(t.id) ?? 0;
    const floatVal = lsVal - esVal;
    const isCritical = floatVal === 0 && t.duration_days > 0;

    result.set(t.id, {
      id: t.id,
      duration_days: t.duration_days,
      early_start: esVal,
      early_finish: efVal,
      late_start: lsVal,
      late_finish: lfVal,
      total_float: floatVal,
      is_critical: isCritical,
    });

    if (isCritical) criticalIds.push(t.id);
  }

  return {
    tasks: result,
    critical_path_ids: criticalIds,
    project_duration: projectDuration,
  };
}

/**
 * Chuyển ES (ngày offset) thành Date thực tế từ project start date.
 */
export function offsetToDate(projectStart: Date, offsetDays: number): Date {
  const d = new Date(projectStart);
  d.setDate(d.getDate() + offsetDays);
  return d;
}
