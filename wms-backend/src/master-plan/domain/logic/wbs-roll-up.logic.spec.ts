import { rollUpProgress } from './wbs-roll-up.logic';

describe('rollUpProgress', () => {
  it('trả về 0 khi mảng rỗng', () => {
    expect(rollUpProgress([])).toBe(0);
  });

  it('trả về 0 khi total=0 trên mọi node', () => {
    expect(rollUpProgress([{ completed: 0, total: 0 }])).toBe(0);
  });

  it('tính 100 khi tất cả hoàn thành', () => {
    expect(
      rollUpProgress([
        { completed: 5, total: 5 },
        { completed: 3, total: 3 },
      ]),
    ).toBe(100);
  });

  it('tính 50 khi một nửa hoàn thành', () => {
    expect(
      rollUpProgress([
        { completed: 2, total: 4 },
        { completed: 1, total: 2 },
      ]),
    ).toBe(50);
  });

  it('làm tròn half-up (Math.round) giá trị 66.666...', () => {
    expect(rollUpProgress([{ completed: 2, total: 3 }])).toBe(67);
  });

  it('bỏ qua node có total=0 trong tổng', () => {
    const res = rollUpProgress([
      { completed: 0, total: 0 },
      { completed: 3, total: 3 },
    ]);
    expect(res).toBe(100);
  });
});
