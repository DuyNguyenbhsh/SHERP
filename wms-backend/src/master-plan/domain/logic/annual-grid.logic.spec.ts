import {
  expandFreqCodeToIsoWeeks,
  expandRruleToIsoWeeks,
  getIsoWeek,
  isoWeeksInYear,
} from './annual-grid.logic';

describe('annual-grid.logic', () => {
  describe('isoWeeksInYear', () => {
    it('2026 là năm 53 tuần (Jan 1 = Thứ 5)', () => {
      expect(isoWeeksInYear(2026)).toBe(53);
    });

    it('2024 có 52 tuần (năm nhuận nhưng Dec 31 là Thứ 3)', () => {
      expect(isoWeeksInYear(2024)).toBe(52);
    });

    it('2025 có 52 tuần (Jan 1 = Thứ 4 non-leap)', () => {
      expect(isoWeeksInYear(2025)).toBe(52);
    });
  });

  describe('getIsoWeek', () => {
    it('ngày 2026-01-01 (Thứ 5) thuộc tuần 1', () => {
      expect(getIsoWeek(new Date(Date.UTC(2026, 0, 1)))).toBe(1);
    });

    it('ngày 2025-12-29 thuộc tuần 1 của 2026 (ISO rule)', () => {
      expect(getIsoWeek(new Date(Date.UTC(2025, 11, 29)))).toBe(1);
    });
  });

  describe('expandFreqCodeToIsoWeeks', () => {
    it('D phủ kín mọi tuần trong năm', () => {
      const w = expandFreqCodeToIsoWeeks('D', 2025);
      expect(w.size).toBe(52);
      expect(w.has(1)).toBe(true);
      expect(w.has(52)).toBe(true);
    });

    it('W phủ kín mọi tuần (giống D cho view year-at-a-glance)', () => {
      const w = expandFreqCodeToIsoWeeks('W', 2025);
      expect(w.size).toBe(52);
    });

    it('BW phủ 26 tuần lẻ', () => {
      const w = expandFreqCodeToIsoWeeks('BW', 2025);
      expect(w.size).toBe(26);
      expect(w.has(1)).toBe(true);
      expect(w.has(3)).toBe(true);
      expect(w.has(2)).toBe(false);
    });

    it('M phủ 12 tuần (mỗi tháng 1 lần)', () => {
      const w = expandFreqCodeToIsoWeeks('M', 2025);
      expect(w.size).toBeGreaterThanOrEqual(11); // Có thể 12 hoặc 11 nếu 2 tháng dùng chung tuần ISO
      expect(w.size).toBeLessThanOrEqual(12);
    });

    it('Q phủ 4 điểm', () => {
      const w = expandFreqCodeToIsoWeeks('Q', 2025);
      expect(w.size).toBeGreaterThanOrEqual(3);
      expect(w.size).toBeLessThanOrEqual(4);
    });

    it('HY phủ 2 điểm (đầu năm + giữa năm)', () => {
      const w = expandFreqCodeToIsoWeeks('HY', 2025);
      expect(w.size).toBe(2);
    });

    it('Y phủ 1 tuần duy nhất', () => {
      const w = expandFreqCodeToIsoWeeks('Y', 2025);
      expect(w.size).toBe(1);
      expect(w.has(1)).toBe(true);
    });

    it('Y_URGENT cũng phủ 1 tuần (allow_adhoc_trigger được flag riêng, không đổi grid)', () => {
      const w = expandFreqCodeToIsoWeeks('Y_URGENT', 2025);
      expect(w.size).toBe(1);
    });

    it('freq_code rỗng/null trả về set rỗng', () => {
      expect(expandFreqCodeToIsoWeeks(null, 2025).size).toBe(0);
      expect(expandFreqCodeToIsoWeeks('', 2025).size).toBe(0);
      expect(expandFreqCodeToIsoWeeks('INVALID', 2025).size).toBe(0);
    });
  });

  describe('expandRruleToIsoWeeks (fallback)', () => {
    it('FREQ=WEEKLY;BYDAY=MO → 52 tuần 2025 đều có T2', () => {
      const w = expandRruleToIsoWeeks('FREQ=WEEKLY;BYDAY=MO', 2025);
      expect(w.size).toBeGreaterThanOrEqual(52);
    });

    it('FREQ=MONTHLY;BYMONTHDAY=1 → 12 tuần (mỗi tháng 1 lần)', () => {
      const w = expandRruleToIsoWeeks('FREQ=MONTHLY;BYMONTHDAY=1', 2025);
      expect(w.size).toBeGreaterThanOrEqual(11);
      expect(w.size).toBeLessThanOrEqual(12);
    });

    it('RRULE sai cú pháp → trả về set rỗng (không throw)', () => {
      const w = expandRruleToIsoWeeks('NOT_A_RRULE', 2025);
      expect(w.size).toBe(0);
    });
  });
});
