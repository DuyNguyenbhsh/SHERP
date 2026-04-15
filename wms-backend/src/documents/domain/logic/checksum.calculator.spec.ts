import { calculateChecksum } from './checksum.calculator';

describe('calculateChecksum', () => {
  it('trả về SHA-256 hex 64 ký tự', () => {
    const result = calculateChecksum(Buffer.from('hello'));
    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[a-f0-9]+$/);
  });

  it('deterministic — cùng input trả cùng output', () => {
    const a = calculateChecksum(Buffer.from('SHERP Document Control'));
    const b = calculateChecksum(Buffer.from('SHERP Document Control'));
    expect(a).toBe(b);
  });

  it('khác buffer → khác hash', () => {
    const a = calculateChecksum(Buffer.from('version 1'));
    const b = calculateChecksum(Buffer.from('version 2'));
    expect(a).not.toBe(b);
  });

  it('empty buffer vẫn tính được hash', () => {
    const result = calculateChecksum(Buffer.from(''));
    expect(result).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('nhạy cảm với 1 byte thay đổi', () => {
    const a = calculateChecksum(Buffer.from('abc'));
    const b = calculateChecksum(Buffer.from('abd'));
    expect(a).not.toBe(b);
  });
});
