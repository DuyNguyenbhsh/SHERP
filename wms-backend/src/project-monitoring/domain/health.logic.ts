/**
 * Project Health Calculator — Pure domain logic (PROJ2).
 * Tính SPI, CPI từ Baseline (PV) và Actual (EV, AC).
 * Không phụ thuộc NestJS/TypeORM.
 */

export interface HealthInput {
  /** Planned Value — từ baseline plan */
  planned_value: number;
  /** Earned Value — % hoàn thành × PV */
  earned_value: number;
  /** Actual Cost — tổng chi phí thực tế (transactions + WMS) */
  actual_cost: number;
  /** Budget At Completion — tổng ngân sách baseline */
  bac: number;
}

export interface ProjectHealthResult {
  spi: number;
  cpi: number;
  schedule_variance: number;
  cost_variance: number;
  eac: number;
  etc: number;
  vac: number;
  health_status: 'GREEN' | 'YELLOW' | 'RED';
  health_label: string;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * calculateProjectHealth: Tính toán sức khỏe dự án dựa trên EVM.
 * SPI >= 0.9 && CPI >= 0.9 → GREEN
 * SPI >= 0.8 && CPI >= 0.8 → YELLOW
 * else → RED
 */
export function calculateProjectHealth(
  input: HealthInput,
): ProjectHealthResult {
  const { planned_value, earned_value, actual_cost, bac } = input;

  const spi = planned_value > 0 ? round2(earned_value / planned_value) : 0;
  const cpi = actual_cost > 0 ? round2(earned_value / actual_cost) : 0;
  const sv = round2(earned_value - planned_value);
  const cv = round2(earned_value - actual_cost);
  const eac = cpi > 0 ? round2(bac / cpi) : bac;
  const etc = Math.max(0, round2(eac - actual_cost));
  const vac = round2(bac - eac);

  let health_status: 'GREEN' | 'YELLOW' | 'RED';
  let health_label: string;

  if (spi >= 0.9 && cpi >= 0.9) {
    health_status = 'GREEN';
    health_label = 'Dự án hoạt động tốt';
  } else if (spi >= 0.8 && cpi >= 0.8) {
    health_status = 'YELLOW';
    health_label = 'Cần theo dõi — có dấu hiệu chậm tiến độ hoặc vượt chi phí';
  } else {
    health_status = 'RED';
    health_label = 'Cảnh báo — Dự án đang gặp vấn đề nghiêm trọng';
  }

  return {
    spi,
    cpi,
    schedule_variance: sv,
    cost_variance: cv,
    eac,
    etc,
    vac,
    health_status,
    health_label,
  };
}

/**
 * Tính % hoàn thành tổng thể từ WBS weighted average.
 */
export function calculateOverallProgress(
  wbsItems: { weight: number; progress_percent: number }[],
): number {
  if (wbsItems.length === 0) return 0;
  const totalWeight = wbsItems.reduce((s, w) => s + Number(w.weight), 0);
  if (totalWeight === 0) {
    return round2(
      wbsItems.reduce((s, w) => s + Number(w.progress_percent), 0) /
        wbsItems.length,
    );
  }
  return round2(
    wbsItems.reduce(
      (s, w) => s + Number(w.weight) * Number(w.progress_percent),
      0,
    ) / totalWeight,
  );
}
