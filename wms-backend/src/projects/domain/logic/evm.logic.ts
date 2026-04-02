/**
 * EVM (Earned Value Management) — Pure domain logic.
 * Không phụ thuộc NestJS, TypeORM, hay bất kỳ framework nào.
 *
 * Công thức chuẩn PMI/PMBOK:
 *   PV = Planned Value (CBS planned amount)
 *   EV = Earned Value = progress% × PV
 *   AC = Actual Cost (tổng chi phí thực tế)
 *   CV = Cost Variance = EV - AC (âm = vượt ngân sách)
 *   SV = Schedule Variance = EV - PV (âm = chậm tiến độ)
 *   CPI = Cost Performance Index = EV / AC (< 1 = kém hiệu quả)
 *   SPI = Schedule Performance Index = EV / PV (< 1 = chậm)
 *   BAC = Budget At Completion = tổng PV
 *   EAC = Estimate At Completion = BAC / CPI
 *   ETC = Estimate To Complete = EAC - AC
 */

import type {
  EvmWbsInput,
  EvmCbsAggregation,
  EvmActualCostAggregation,
  EvmRow,
  EvmAnalysis,
} from '../types';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calculateEvmPerWbs(
  wbsNodes: EvmWbsInput[],
  cbsMap: Map<string, number>,
  acMap: Map<string, number>,
): EvmRow[] {
  return wbsNodes.map((wbs) => {
    const pv = cbsMap.get(wbs.id) ?? 0;
    const progress = Number(wbs.progress_percent) / 100;
    const ev = progress * pv;
    const ac = acMap.get(wbs.id) ?? 0;
    const cv = ev - ac;
    const sv = ev - pv;
    const cpi = ac > 0 ? round2(ev / ac) : 0;
    const spi = pv > 0 ? round2(ev / pv) : 0;

    return {
      wbs_id: wbs.id,
      wbs_code: wbs.code,
      wbs_name: wbs.name,
      progress_percent: Number(wbs.progress_percent),
      planned_value: pv,
      earned_value: round2(ev),
      actual_cost: ac,
      cost_variance: round2(cv),
      schedule_variance: round2(sv),
      cpi,
      spi,
    };
  });
}

export function calculateEvmSummary(
  rows: EvmRow[],
  unassignedActualCost: number,
): EvmAnalysis {
  const totalPV = rows.reduce((s, r) => s + r.planned_value, 0);
  const totalEV = rows.reduce((s, r) => s + r.earned_value, 0);
  const totalAC =
    rows.reduce((s, r) => s + r.actual_cost, 0) + unassignedActualCost;
  const totalCV = totalEV - totalAC;
  const totalSV = totalEV - totalPV;
  const overallCPI = totalAC > 0 ? round2(totalEV / totalAC) : 0;
  const overallSPI = totalPV > 0 ? round2(totalEV / totalPV) : 0;

  const bac = totalPV;
  const eac = overallCPI > 0 ? round2(bac / overallCPI) : bac;
  const etc = Math.max(0, round2(eac - totalAC));

  return {
    summary: {
      bac,
      total_pv: totalPV,
      total_ev: totalEV,
      total_ac: totalAC,
      cost_variance: totalCV,
      schedule_variance: totalSV,
      cpi: overallCPI,
      spi: overallSPI,
      eac,
      etc,
      status: totalCV >= 0 ? 'UNDER_BUDGET' : 'OVER_BUDGET',
    },
    breakdown: rows,
  };
}

/** Helper: chuyển raw DB rows thành Map */
export function buildCbsMap(rows: EvmCbsAggregation[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.wbs_id, r.total_planned);
  return map;
}

export function buildActualCostMap(
  rows: EvmActualCostAggregation[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.wbs_id, r.total_actual);
  return map;
}
