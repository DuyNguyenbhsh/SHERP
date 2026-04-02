import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ReportsService } from './reports.service';
import { MonthlyBudgetVariance } from './entities/monthly-budget-variance.view-entity';

// ════════════════════════════════════════════════════════════════
// Integration Test: getBudgetVariance
// Giả lập DataSource + QueryBuilder để kiểm tra logic mapping
// và filtering mà không cần kết nối DB thật.
// ════════════════════════════════════════════════════════════════

describe('ReportsService — Integration (getBudgetVariance)', () => {
  let service: ReportsService;
  let mockGetRawMany: jest.Mock;
  let mockQb: Record<string, jest.Mock>;

  beforeEach(async () => {
    // ── Giả lập chuỗi QueryBuilder (fluent API) ──
    mockGetRawMany = jest.fn();
    mockQb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getRawMany: mockGetRawMany,
    };

    const mockDataSource = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
    } as unknown as DataSource;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  // ── 1. Trả về dữ liệu đã map đúng kiểu số từ raw DB rows ──
  it('map raw DB rows sang MonthlyBudgetVariance[] đúng kiểu số', async () => {
    // Dữ liệu giả lập giống output thực tế từ getRawMany()
    mockGetRawMany.mockResolvedValue([
      {
        v_project_code: 'DA-001',
        v_project_name: 'Nhà máy Bình Dương',
        v_reporting_year: '2026', // DB trả về string
        v_reporting_month: '1',
        v_opening_budget: '5000000.00', // DB trả về decimal dạng string
        v_closing_budget: '6000000.00',
        v_variance_amount: '1000000.00',
        v_variance_percentage: '20.00',
      },
      {
        v_project_code: 'DA-001',
        v_project_name: 'Nhà máy Bình Dương',
        v_reporting_year: '2026',
        v_reporting_month: '2',
        v_opening_budget: '6000000.00',
        v_closing_budget: '6000000.00',
        v_variance_amount: '0.00',
        v_variance_percentage: '0.00',
      },
    ]);

    const result = await service.getBudgetVariance({});

    expect(result.status).toBe('success');
    expect(result.data).toHaveLength(2);

    // Tháng 1: tăng ngân sách
    const jan = result.data[0];
    expect(jan.project_code).toBe('DA-001');
    expect(jan.reporting_year).toBe(2026); // number, không phải string
    expect(jan.reporting_month).toBe(1);
    expect(jan.opening_budget).toBe(5_000_000); // number
    expect(jan.closing_budget).toBe(6_000_000);
    expect(jan.variance_amount).toBe(1_000_000);
    expect(jan.variance_percentage).toBe(20);

    // Tháng 2: không đổi
    const feb = result.data[1];
    expect(feb.opening_budget).toBe(6_000_000);
    expect(feb.closing_budget).toBe(6_000_000);
    expect(feb.variance_amount).toBe(0);
    expect(feb.variance_percentage).toBe(0);
  });

  // ── 2. Xử lý giá trị null/NaN từ DB → fallback về 0 ──
  it('giá trị null từ DB được fallback về 0', async () => {
    mockGetRawMany.mockResolvedValue([
      {
        v_project_code: 'DA-002',
        v_project_name: 'Kho Long An',
        v_reporting_year: '2026',
        v_reporting_month: '3',
        v_opening_budget: null, // Chưa có budget ban đầu
        v_closing_budget: null,
        v_variance_amount: null,
        v_variance_percentage: null,
      },
    ]);

    const result = await service.getBudgetVariance({});

    expect(result.data[0].opening_budget).toBe(0);
    expect(result.data[0].closing_budget).toBe(0);
    expect(result.data[0].variance_amount).toBe(0);
    expect(result.data[0].variance_percentage).toBe(0);
  });

  // ── 3. Filter theo project_id → gọi innerJoin + andWhere ──
  it('filter project_id gọi innerJoin projects', async () => {
    mockGetRawMany.mockResolvedValue([]);

    const projectId = '550e8400-e29b-41d4-a716-446655440000';
    await service.getBudgetVariance({ project_id: projectId });

    // Kiểm tra QueryBuilder được gọi đúng join + where
    expect(mockQb.innerJoin).toHaveBeenCalledWith(
      'projects',
      'p',
      'p.project_code = v.project_code',
    );
    expect(mockQb.andWhere).toHaveBeenCalledWith('p.id = :projectId', {
      projectId,
    });
  });

  // ── 4. Filter theo year → gọi andWhere ──
  it('filter year gọi andWhere reporting_year', async () => {
    mockGetRawMany.mockResolvedValue([]);

    await service.getBudgetVariance({ year: 2026 });

    expect(mockQb.andWhere).toHaveBeenCalledWith('v.reporting_year = :year', {
      year: 2026,
    });
  });

  // ── 5. Không filter → không gọi innerJoin/andWhere ──
  it('không filter → không gọi innerJoin/andWhere', async () => {
    mockGetRawMany.mockResolvedValue([]);

    await service.getBudgetVariance({});

    expect(mockQb.innerJoin).not.toHaveBeenCalled();
    expect(mockQb.andWhere).not.toHaveBeenCalled();
  });

  // ── 6. Trả về mảng rỗng khi không có dữ liệu ──
  it('trả về mảng rỗng khi không có dữ liệu', async () => {
    mockGetRawMany.mockResolvedValue([]);

    const result = await service.getBudgetVariance({});

    expect(result.status).toBe('success');
    expect(result.data).toEqual([]);
  });

  // ── 7. Giảm ngân sách (variance âm) hiển thị đúng ──
  it('giảm ngân sách → variance_amount âm, percentage âm', async () => {
    mockGetRawMany.mockResolvedValue([
      {
        v_project_code: 'DA-003',
        v_project_name: 'Dự án cắt giảm',
        v_reporting_year: '2026',
        v_reporting_month: '6',
        v_opening_budget: '10000000.00',
        v_closing_budget: '7000000.00',
        v_variance_amount: '-3000000.00',
        v_variance_percentage: '-30.00',
      },
    ]);

    const result = await service.getBudgetVariance({});
    const row = result.data[0];

    expect(row.variance_amount).toBe(-3_000_000);
    expect(row.variance_percentage).toBe(-30);
  });

  // ── 8. Nhiều dự án cùng lúc ──
  it('xử lý nhiều dự án trong cùng một response', async () => {
    mockGetRawMany.mockResolvedValue([
      {
        v_project_code: 'DA-001',
        v_project_name: 'Dự án A',
        v_reporting_year: '2026',
        v_reporting_month: '1',
        v_opening_budget: '1000000.00',
        v_closing_budget: '1200000.00',
        v_variance_amount: '200000.00',
        v_variance_percentage: '20.00',
      },
      {
        v_project_code: 'DA-002',
        v_project_name: 'Dự án B',
        v_reporting_year: '2026',
        v_reporting_month: '1',
        v_opening_budget: '5000000.00',
        v_closing_budget: '4500000.00',
        v_variance_amount: '-500000.00',
        v_variance_percentage: '-10.00',
      },
    ]);

    const result = await service.getBudgetVariance({});

    expect(result.data).toHaveLength(2);
    expect(result.data[0].project_code).toBe('DA-001');
    expect(result.data[1].project_code).toBe('DA-002');
    expect(result.data[1].variance_amount).toBe(-500_000);
  });

  // ── 9. Ordering luôn được áp dụng ──
  it('luôn order theo project_code, year, month', async () => {
    mockGetRawMany.mockResolvedValue([]);

    await service.getBudgetVariance({});

    expect(mockQb.orderBy).toHaveBeenCalledWith('v.project_code', 'ASC');
    expect(mockQb.addOrderBy).toHaveBeenCalledWith('v.reporting_year', 'ASC');
    expect(mockQb.addOrderBy).toHaveBeenCalledWith('v.reporting_month', 'ASC');
  });
});
