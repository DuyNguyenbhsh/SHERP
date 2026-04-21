// Pure functions cho Annual Grid (BA §10.4, SA §15.5).
// Expand template thành set các ISO-week trong 1 năm.

import { parseRRule } from './rrule-parser.logic';

/**
 * Số tuần ISO của một năm (52 hoặc 53).
 * Năm có 53 tuần khi ngày đầu năm là Thứ 5, hoặc năm nhuận và ngày đầu năm là Thứ 4.
 */
export function isoWeeksInYear(year: number): number {
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const dec31 = new Date(Date.UTC(year, 11, 31));
  const leap = isLeap(year);
  return jan1.getUTCDay() === 4 || (leap && dec31.getUTCDay() === 4) ? 53 : 52;
}

function isLeap(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Tính ISO week number (1-53) từ Date UTC theo chuẩn ISO-8601.
 */
export function getIsoWeek(d: Date): number {
  // Thuật toán chuẩn ISO-8601: tìm Thứ 5 của tuần, rồi đếm từ 1/1 năm đó.
  const date = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  // ISO week: shift tới Thứ 5 trong tuần chứa date
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Shortcut: freq_code (D/W/BW/M/Q/BiQ/HY/Y/Y_URGENT) → Set<isoWeek>.
 * Dùng cho Annual Grid view + export XLSX (không phải cho cron thật).
 *
 * BR-MP-13: render planned từ RRULE/freq_code expand, không phụ thuộc work_items đã sinh.
 */
export function expandFreqCodeToIsoWeeks(
  freqCode: string | null | undefined,
  year: number,
): Set<number> {
  const totalWeeks = isoWeeksInYear(year);
  const weeks = new Set<number>();
  if (!freqCode) return weeks;

  switch (freqCode) {
    case 'D':
    case 'W':
      for (let w = 1; w <= totalWeeks; w++) weeks.add(w);
      return weeks;

    case 'BW':
      for (let w = 1; w <= totalWeeks; w += 2) weeks.add(w);
      return weeks;

    case 'M':
      // Tuần ISO chứa ngày mùng 1 của mỗi tháng
      for (let m = 0; m < 12; m++) {
        const d = new Date(Date.UTC(year, m, 1));
        weeks.add(getIsoWeek(d));
      }
      return weeks;

    case 'Q':
      // 4 quý: tháng 1/4/7/10
      for (const m of [0, 3, 6, 9]) {
        weeks.add(getIsoWeek(new Date(Date.UTC(year, m, 1))));
      }
      return weeks;

    case 'BiQ':
      // 3 lần/năm: tháng 1/5/9
      for (const m of [0, 4, 8]) {
        weeks.add(getIsoWeek(new Date(Date.UTC(year, m, 1))));
      }
      return weeks;

    case 'HY':
      for (const m of [0, 6]) {
        weeks.add(getIsoWeek(new Date(Date.UTC(year, m, 1))));
      }
      return weeks;

    case 'Y':
    case 'Y_URGENT':
      weeks.add(1);
      return weeks;

    default:
      return weeks;
  }
}

/**
 * Fallback khi task_template chưa có freq_code: expand từ RRULE trực tiếp
 * bằng cách walk từng ngày trong năm và kiểm tra matches.
 * Chỉ hỗ trợ subset RRULE hiện có (DAILY/WEEKLY/MONTHLY).
 */
export function expandRruleToIsoWeeks(
  rrule: string,
  year: number,
): Set<number> {
  const weeks = new Set<number>();
  try {
    parseRRule(rrule); // validate cú pháp; nếu YEARLY → throw → return empty
  } catch {
    return weeks;
  }
  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
  const cursor = new Date(startOfYear);
  // Walk day-by-day — rẻ vì năm chỉ ~366 ngày
  while (cursor.getTime() <= endOfYear.getTime()) {
    if (matchesSimple(rrule, cursor)) {
      weeks.add(getIsoWeek(cursor));
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return weeks;
}

function matchesSimple(rrule: string, d: Date): boolean {
  const r = parseRRule(rrule);
  if (r.byMonthDay && !r.byMonthDay.includes(d.getUTCDate())) return false;
  if (r.byDay) {
    const codes = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    if (!r.byDay.includes(codes[d.getUTCDay()])) return false;
  }
  return true;
}
