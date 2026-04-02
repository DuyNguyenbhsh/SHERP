/**
 * Domain types cho Earned Value Management (EVM).
 * Pure TypeScript — không phụ thuộc framework.
 */

export interface EvmWbsInput {
  id: string;
  code: string;
  name: string;
  progress_percent: number;
}

export interface EvmCbsAggregation {
  wbs_id: string;
  total_planned: number;
}

export interface EvmActualCostAggregation {
  wbs_id: string;
  total_actual: number;
}

export interface EvmRow {
  wbs_id: string;
  wbs_code: string;
  wbs_name: string;
  progress_percent: number;
  planned_value: number;
  earned_value: number;
  actual_cost: number;
  cost_variance: number;
  schedule_variance: number;
  cpi: number;
  spi: number;
}

export interface EvmSummary {
  bac: number;
  total_pv: number;
  total_ev: number;
  total_ac: number;
  cost_variance: number;
  schedule_variance: number;
  cpi: number;
  spi: number;
  eac: number;
  etc: number;
  status: 'UNDER_BUDGET' | 'OVER_BUDGET';
}

export interface EvmAnalysis {
  summary: EvmSummary;
  breakdown: EvmRow[];
}
