import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ReportsService } from './reports.service';

// ────────────────────────────────────────────────────────────────
// Mock DataSource — chỉ cần cho khởi tạo DI, unit test không gọi DB
// ────────────────────────────────────────────────────────────────
const mockDataSource = {} as DataSource;

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it('service khởi tạo thành công', () => {
    expect(service).toBeDefined();
  });

  // ════════════════════════════════════════════════════════════════
  // Unit Tests: calculateVariancePercentage
  // ════════════════════════════════════════════════════════════════
  describe('calculateVariancePercentage', () => {
    // ── 1. Trường hợp bình thường: tăng ngân sách ──
    it('tăng ngân sách 10M → 12M = +20%', () => {
      const result = service.calculateVariancePercentage(
        10_000_000,
        12_000_000,
      );
      expect(result).toBe(20);
    });

    // ── 2. Trường hợp bình thường: giảm ngân sách (số âm) ──
    it('giảm ngân sách 10M → 8M = -20%', () => {
      const result = service.calculateVariancePercentage(10_000_000, 8_000_000);
      expect(result).toBe(-20);
    });

    // ── 3. Không có thay đổi → 0% ──
    it('không đổi 5M → 5M = 0%', () => {
      const result = service.calculateVariancePercentage(5_000_000, 5_000_000);
      expect(result).toBe(0);
    });

    // ── 4. Độ chính xác: làm tròn 2 chữ số thập phân ──
    it('làm tròn 2 decimal: 10M → 11.556M = 15.56%', () => {
      // (11_556_000 - 10_000_000) / 10_000_000 * 100 = 15.56
      const result = service.calculateVariancePercentage(
        10_000_000,
        11_556_000,
      );
      expect(result).toBe(15.56);
    });

    it('làm tròn 2 decimal: 3 → 10 = 233.33%', () => {
      // (10 - 3) / 3 * 100 = 233.3333... → 233.33
      const result = service.calculateVariancePercentage(3, 10);
      expect(result).toBe(233.33);
    });

    // ── 5. Trường hợp Zero: oldValue = 0 ──
    it('oldValue = 0, newValue > 0 → trả về 100 (không Divide by Zero)', () => {
      const result = service.calculateVariancePercentage(0, 5_000_000);
      expect(result).toBe(100);
    });

    it('oldValue = 0, newValue = 0 → trả về 0', () => {
      const result = service.calculateVariancePercentage(0, 0);
      expect(result).toBe(0);
    });

    it('oldValue = 0, newValue < 0 → trả về 100', () => {
      // Trường hợp hiếm: ngân sách âm, nhưng logic vẫn xử lý
      const result = service.calculateVariancePercentage(0, -1_000_000);
      expect(result).toBe(100);
    });

    // ── 6. Trường hợp Null/Undefined: không crash ──
    it('oldValue = null → trả về 0', () => {
      const result = service.calculateVariancePercentage(null, 10_000_000);
      expect(result).toBe(0);
    });

    it('newValue = null → trả về 0', () => {
      const result = service.calculateVariancePercentage(10_000_000, null);
      expect(result).toBe(0);
    });

    it('cả hai null → trả về 0', () => {
      const result = service.calculateVariancePercentage(null, null);
      expect(result).toBe(0);
    });

    it('oldValue = undefined → trả về 0', () => {
      const result = service.calculateVariancePercentage(undefined, 10_000_000);
      expect(result).toBe(0);
    });

    it('newValue = undefined → trả về 0', () => {
      const result = service.calculateVariancePercentage(10_000_000, undefined);
      expect(result).toBe(0);
    });

    it('cả hai undefined → trả về 0', () => {
      const result = service.calculateVariancePercentage(undefined, undefined);
      expect(result).toBe(0);
    });

    // ── 7. Số âm: điều chỉnh giảm ngân sách lớn ──
    it('giảm mạnh 10M → 2M = -80%', () => {
      const result = service.calculateVariancePercentage(10_000_000, 2_000_000);
      expect(result).toBe(-80);
    });

    it('giảm về 0: 10M → 0 = -100%', () => {
      const result = service.calculateVariancePercentage(10_000_000, 0);
      expect(result).toBe(-100);
    });

    it('giảm quá mức (âm): 10M → -2M = -120%', () => {
      // Trường hợp điều chỉnh vượt quá ngân sách ban đầu
      const result = service.calculateVariancePercentage(
        10_000_000,
        -2_000_000,
      );
      expect(result).toBe(-120);
    });

    // ── 8. Giá trị thập phân nhỏ ──
    it('giá trị nhỏ: 100.50 → 105.75 = 5.22%', () => {
      // (105.75 - 100.50) / 100.50 * 100 = 5.2238... → 5.22
      const result = service.calculateVariancePercentage(100.5, 105.75);
      expect(result).toBe(5.22);
    });

    // ── 9. Giá trị cực lớn ──
    it('giá trị lớn: 1 tỷ → 1.5 tỷ = 50%', () => {
      const result = service.calculateVariancePercentage(
        1_000_000_000,
        1_500_000_000,
      );
      expect(result).toBe(50);
    });
  });
});
