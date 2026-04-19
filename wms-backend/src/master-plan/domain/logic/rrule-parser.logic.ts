// Pure function: parse RRULE string (RFC 5545, simplified subset) → next N occurrences.
// Phase A hỗ trợ: FREQ=DAILY|WEEKLY|MONTHLY + BYDAY + BYMONTHDAY + BYHOUR + INTERVAL.
// Gate 5 QA sẽ bổ sung thư viện `rrule` đầy đủ + spec.

export interface ParsedRRule {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  interval: number;
  byDay?: string[]; // MO|TU|WE|TH|FR|SA|SU
  byMonthDay?: number[];
  byHour?: number;
}

export function parseRRule(rule: string): ParsedRRule {
  const parts = Object.fromEntries(
    rule.split(';').map((kv) => {
      const [k, v] = kv.split('=');
      return [k.toUpperCase(), v];
    }),
  );
  const freq = parts.FREQ as ParsedRRule['freq'];
  if (!['DAILY', 'WEEKLY', 'MONTHLY'].includes(freq)) {
    throw new Error(`FREQ không hỗ trợ: ${freq}`);
  }
  return {
    freq,
    interval: parts.INTERVAL ? Number(parts.INTERVAL) : 1,
    byDay: parts.BYDAY ? parts.BYDAY.split(',') : undefined,
    byMonthDay: parts.BYMONTHDAY
      ? parts.BYMONTHDAY.split(',').map(Number)
      : undefined,
    byHour: parts.BYHOUR ? Number(parts.BYHOUR) : undefined,
  };
}

export function nextOccurrences(
  rule: string,
  startDate: Date,
  count: number,
): Date[] {
  const r = parseRRule(rule);
  const out: Date[] = [];
  const cursor = new Date(startDate);
  cursor.setUTCHours(r.byHour ?? 7, 0, 0, 0);

  while (out.length < count) {
    if (matches(r, cursor)) out.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (out.length > count * 400) break; // safety
  }
  return out;
}

function matches(r: ParsedRRule, d: Date): boolean {
  if (r.byMonthDay && !r.byMonthDay.includes(d.getUTCDate())) return false;
  if (r.byDay) {
    const codes = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    if (!r.byDay.includes(codes[d.getUTCDay()])) return false;
  }
  return true;
}
