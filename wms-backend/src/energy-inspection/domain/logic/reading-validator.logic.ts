// Pure fn: validate + tính delta cho 1 reading mới.
// BR-EI-01: đồng hồ cumulative → value mới phải ≥ previous value.

export interface ReadingValidationInput {
  isCumulative: boolean;
  newValue: string;
  previousValue: string | null;
}

export interface ReadingValidationOutput {
  ok: boolean;
  reason?: string;
  delta?: string;
}

export function validateReading(
  input: ReadingValidationInput,
): ReadingValidationOutput {
  const parsed = Number(input.newValue);
  if (Number.isNaN(parsed) || parsed < 0) {
    return { ok: false, reason: 'Giá trị đọc không hợp lệ (phải là số ≥ 0)' };
  }

  if (input.previousValue == null) {
    return { ok: true, delta: parsed.toFixed(4) };
  }

  const prev = Number(input.previousValue);
  const delta = parsed - prev;

  if (input.isCumulative && delta < 0) {
    return {
      ok: false,
      reason: `BR-EI-01: Đồng hồ tổng không được giảm (${parsed} < ${prev})`,
    };
  }

  return { ok: true, delta: delta.toFixed(4) };
}
