import { validateReading } from './reading-validator.logic';

describe('validateReading (Energy BR-EI-01)', () => {
  it('Lần đọc đầu tiên (previous null) → OK, delta = value', () => {
    const r = validateReading({
      isCumulative: true,
      newValue: '1000',
      previousValue: null,
    });
    expect(r.ok).toBe(true);
    expect(r.delta).toBe('1000.0000');
  });

  it('cumulative + value tăng → OK, delta dương', () => {
    const r = validateReading({
      isCumulative: true,
      newValue: '1250.5',
      previousValue: '1000.0',
    });
    expect(r.ok).toBe(true);
    expect(r.delta).toBe('250.5000');
  });

  it('cumulative + value giảm → BR-EI-01 FAIL', () => {
    const r = validateReading({
      isCumulative: true,
      newValue: '900',
      previousValue: '1000',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('BR-EI-01');
  });

  it('non-cumulative + value giảm → OK (differential meter)', () => {
    const r = validateReading({
      isCumulative: false,
      newValue: '900',
      previousValue: '1000',
    });
    expect(r.ok).toBe(true);
    expect(r.delta).toBe('-100.0000');
  });

  it('value âm → FAIL', () => {
    const r = validateReading({
      isCumulative: true,
      newValue: '-5',
      previousValue: null,
    });
    expect(r.ok).toBe(false);
  });

  it('value không phải số → FAIL', () => {
    const r = validateReading({
      isCumulative: true,
      newValue: 'abc',
      previousValue: null,
    });
    expect(r.ok).toBe(false);
  });
});
