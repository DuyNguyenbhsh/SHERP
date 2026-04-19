import { buildIncidentCode } from './incident-code-generator.logic';

describe('buildIncidentCode', () => {
  it('pad sequence 3 chữ số', () => {
    const d = new Date('2026-04-19T10:00:00Z');
    expect(buildIncidentCode(d, 1)).toBe('IC-260419-001');
    expect(buildIncidentCode(d, 27)).toBe('IC-260419-027');
    expect(buildIncidentCode(d, 999)).toBe('IC-260419-999');
  });

  it('dùng UTC date (tránh timezone skew)', () => {
    const d = new Date('2026-01-05T00:00:00Z');
    expect(buildIncidentCode(d, 5)).toBe('IC-260105-005');
  });

  it('throw khi sequence ngoài [1,999]', () => {
    const d = new Date();
    expect(() => buildIncidentCode(d, 0)).toThrow();
    expect(() => buildIncidentCode(d, 1000)).toThrow();
    expect(() => buildIncidentCode(d, -5)).toThrow();
  });
});
