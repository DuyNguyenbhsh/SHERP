import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BudgetVarianceQueryDto } from './dto/budget-variance-query.dto';
import { MonthlyBudgetVariance } from './entities/monthly-budget-variance.view-entity';

@Injectable()
export class ReportsService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Tính tỷ lệ % biến động ngân sách giữa giá trị cũ và mới.
   * - Nếu một trong hai giá trị null/undefined → trả về 0
   * - Nếu oldValue = 0 và newValue > 0 → trả về 100 (tránh Divide by Zero)
   * - Kết quả làm tròn 2 chữ số thập phân
   */
  calculateVariancePercentage(
    oldValue: number | null | undefined,
    newValue: number | null | undefined,
  ): number {
    // Trường hợp Null/Undefined: trả về 0, không crash
    if (oldValue == null || newValue == null) {
      return 0;
    }

    // Trường hợp Zero: tránh chia cho 0
    if (oldValue === 0) {
      // Nếu cả hai đều = 0 → không có biến động
      if (newValue === 0) return 0;
      // Nếu oldValue = 0, newValue != 0 → biến động 100%
      return 100;
    }

    // Tính toán bình thường: ((new - old) / old) * 100, làm tròn 2 số thập phân
    const percentage = ((newValue - oldValue) / oldValue) * 100;
    return Math.round(percentage * 100) / 100;
  }

  async getBudgetVariance(query: BudgetVarianceQueryDto): Promise<{
    status: string;
    message: string;
    data: MonthlyBudgetVariance[];
  }> {
    const qb = this.dataSource
      .createQueryBuilder()
      .select('v')
      .from(MonthlyBudgetVariance, 'v');

    if (query.project_id) {
      // Join ngược lại bảng projects để lọc theo project_id
      qb.innerJoin('projects', 'p', 'p.project_code = v.project_code').andWhere(
        'p.id = :projectId',
        { projectId: query.project_id },
      );
    }

    if (query.year) {
      qb.andWhere('v.reporting_year = :year', { year: query.year });
    }

    qb.orderBy('v.project_code', 'ASC')
      .addOrderBy('v.reporting_year', 'ASC')
      .addOrderBy('v.reporting_month', 'ASC');

    const data = await qb.getRawMany();

    // Map raw results về đúng kiểu số
    const mapped: MonthlyBudgetVariance[] = data.map((row) => ({
      project_code: row.v_project_code,
      project_name: row.v_project_name,
      reporting_year: Number(row.v_reporting_year),
      reporting_month: Number(row.v_reporting_month),
      opening_budget: Number(row.v_opening_budget) || 0,
      closing_budget: Number(row.v_closing_budget) || 0,
      variance_amount: Number(row.v_variance_amount) || 0,
      variance_percentage: Number(row.v_variance_percentage) || 0,
    }));

    return {
      status: 'success',
      message: 'Lấy báo cáo biến động ngân sách thành công',
      data: mapped,
    };
  }
}
