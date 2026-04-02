/**
 * Repository Port — Interface cho Project data access.
 * Application layer gọi qua interface này, Infrastructure layer implement.
 */

import type { BudgetRow, ActualCostRow } from '../types';
import type {
  EvmCbsAggregation,
  EvmActualCostAggregation,
  EvmWbsInput,
} from '../types';

export const PROJECT_REPO = Symbol('PROJECT_REPO');

export interface IProjectRepository {
  // ── Cost queries ──
  findBudgetRows(projectId: string): Promise<BudgetRow[]>;
  findActualCostRows(projectId: string): Promise<ActualCostRow[]>;

  // ── EVM queries ──
  findWbsNodesForEvm(projectId: string): Promise<EvmWbsInput[]>;
  findCbsAggregations(projectId: string): Promise<EvmCbsAggregation[]>;
  findActualCostByWbs(projectId: string): Promise<EvmActualCostAggregation[]>;
  findUnassignedActualCost(projectId: string): Promise<number>;
}
