/**
 * WBS Tree Building & Progress Propagation — Pure domain logic.
 */

import type { WbsProgressInput } from '../types';

/**
 * Build tree từ flat list. Trả về danh sách root nodes với children đã nested.
 * T phải có id, parent_id — thường là TypeORM entity class.
 */
export function buildWbsTree<
  T extends { id: string; parent_id: string | null },
>(nodes: T[]): (T & { children: any[] })[] {
  const map = new Map<string, T & { children: any[] }>();
  const roots: (T & { children: any[] })[] = [];

  for (const node of nodes) {
    map.set(node.id, { ...node, children: [] });
  }

  for (const node of nodes) {
    const item = map.get(node.id)!;
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(item);
    } else {
      roots.push(item);
    }
  }

  return roots;
}

/**
 * Tính tiến độ cha = trung bình có trọng số của con.
 * Nếu tổng trọng số = 0, dùng trung bình cộng đều.
 */
export function calculateParentProgress(children: WbsProgressInput[]): number {
  if (children.length === 0) return 0;

  const totalWeight = children.reduce((s, c) => s + Number(c.weight), 0);

  let parentProgress: number;
  if (totalWeight > 0) {
    parentProgress =
      children.reduce(
        (s, c) => s + Number(c.weight) * Number(c.progress_percent),
        0,
      ) / totalWeight;
  } else {
    parentProgress =
      children.reduce((s, c) => s + Number(c.progress_percent), 0) /
      children.length;
  }

  return Math.round(parentProgress * 100) / 100;
}

/**
 * Tính level và path khi tạo hoặc di chuyển WBS node.
 */
export function calculateWbsLevelAndPath(
  code: string,
  parent?: { level: number; path: string | null } | null,
): { level: number; path: string } {
  if (!parent) {
    return { level: 0, path: code };
  }
  return {
    level: parent.level + 1,
    path: parent.path ? `${parent.path}.${code}` : code,
  };
}
