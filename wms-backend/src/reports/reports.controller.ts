import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivilegeGuard } from '../auth/guards/privilege.guard';
import { ReportsService } from './reports.service';
import { BudgetVarianceQueryDto } from './dto/budget-variance-query.dto';

@ApiTags('Reports - Báo cáo quản trị')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PrivilegeGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @ApiOperation({ summary: 'Báo cáo biến động ngân sách dự án theo tháng' })
  @Get('budget-variance')
  getBudgetVariance(@Query() query: BudgetVarianceQueryDto) {
    return this.reportsService.getBudgetVariance(query);
  }
}
