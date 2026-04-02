/**
 * Domain types cho WBS (Work Breakdown Structure).
 * Pure TypeScript — không phụ thuộc framework.
 */

export interface WbsNodeFlat {
  id: string;
  parent_id: string | null;
  code: string;
  name: string;
  level: number;
  path: string | null;
  sort_order: number;
  weight: number;
  progress_percent: number;
}

export interface WbsProgressInput {
  weight: number;
  progress_percent: number;
}
