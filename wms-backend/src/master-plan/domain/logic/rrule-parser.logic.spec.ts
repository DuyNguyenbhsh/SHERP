import { parseRRule, nextOccurrences } from './rrule-parser.logic';

describe('parseRRule', () => {
  it('parse FREQ=DAILY với default interval=1', () => {
    const r = parseRRule('FREQ=DAILY');
    expect(r.freq).toBe('DAILY');
    expect(r.interval).toBe(1);
  });

  it('parse FREQ=WEEKLY;BYDAY=MO,FR', () => {
    const r = parseRRule('FREQ=WEEKLY;BYDAY=MO,FR');
    expect(r.freq).toBe('WEEKLY');
    expect(r.byDay).toEqual(['MO', 'FR']);
  });

  it('parse FREQ=MONTHLY;BYMONTHDAY=1,15', () => {
    const r = parseRRule('FREQ=MONTHLY;BYMONTHDAY=1,15');
    expect(r.freq).toBe('MONTHLY');
    expect(r.byMonthDay).toEqual([1, 15]);
  });

  it('parse BYHOUR=7', () => {
    const r = parseRRule('FREQ=DAILY;BYHOUR=7');
    expect(r.byHour).toBe(7);
  });

  it('không phân biệt hoa thường trên key', () => {
    const r = parseRRule('freq=DAILY;interval=3');
    expect(r.freq).toBe('DAILY');
    expect(r.interval).toBe(3);
  });

  it('throw khi FREQ không hỗ trợ', () => {
    expect(() => parseRRule('FREQ=YEARLY')).toThrow(/FREQ không hỗ trợ/);
    expect(() => parseRRule('FREQ=HOURLY')).toThrow();
  });
});

describe('nextOccurrences', () => {
  const start = new Date('2026-04-20T00:00:00Z'); // Monday

  it('DAILY trả về N ngày liên tiếp ở default hour=7', () => {
    const occ = nextOccurrences('FREQ=DAILY', start, 3);
    expect(occ).toHaveLength(3);
    expect(occ[0].toISOString()).toBe('2026-04-20T07:00:00.000Z');
    expect(occ[1].toISOString()).toBe('2026-04-21T07:00:00.000Z');
    expect(occ[2].toISOString()).toBe('2026-04-22T07:00:00.000Z');
  });

  it('BYHOUR=14 set giờ 14:00', () => {
    const occ = nextOccurrences('FREQ=DAILY;BYHOUR=14', start, 1);
    expect(occ[0].toISOString()).toBe('2026-04-20T14:00:00.000Z');
  });

  it('WEEKLY;BYDAY=MO chỉ trả Monday', () => {
    const occ = nextOccurrences('FREQ=WEEKLY;BYDAY=MO', start, 3);
    expect(occ).toHaveLength(3);
    occ.forEach((d) => expect(d.getUTCDay()).toBe(1));
  });

  it('WEEKLY;BYDAY=MO,FR trả Mon + Fri xen kẽ', () => {
    const occ = nextOccurrences('FREQ=WEEKLY;BYDAY=MO,FR', start, 4);
    const days = occ.map((d) => d.getUTCDay());
    expect(days).toEqual([1, 5, 1, 5]);
  });

  it('MONTHLY;BYMONTHDAY=1 trả ngày 1 hàng tháng', () => {
    const occ = nextOccurrences('FREQ=MONTHLY;BYMONTHDAY=1', start, 3);
    expect(occ.map((d) => d.getUTCDate())).toEqual([1, 1, 1]);
    expect(occ[0].getUTCMonth()).toBe(4); // May 2026 (index 4)
  });
});
