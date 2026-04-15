import { nextVersionNumber } from './version-number.calculator';

describe('nextVersionNumber', () => {
  it('version đầu tiên (seq=0 → seq=1 → V1.0)', () => {
    const { seq, label } = nextVersionNumber(0);
    expect(seq).toBe(1);
    expect(label).toBe('V1.0');
  });

  it('V1.0 → V1.1', () => {
    const { seq, label } = nextVersionNumber(1);
    expect(seq).toBe(2);
    expect(label).toBe('V1.1');
  });

  it('V1.9 → V1.10 (không wrap)', () => {
    const { seq, label } = nextVersionNumber(10);
    expect(seq).toBe(11);
    expect(label).toBe('V1.10');
  });

  it('seq tăng đơn điệu', () => {
    const seqs = [0, 1, 5, 10, 99].map((n) => nextVersionNumber(n).seq);
    expect(seqs).toEqual([1, 2, 6, 11, 100]);
  });

  it('label format đúng với seq lớn', () => {
    expect(nextVersionNumber(49).label).toBe('V1.49');
    expect(nextVersionNumber(100).label).toBe('V1.100');
  });
});
