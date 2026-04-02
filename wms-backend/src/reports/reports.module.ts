import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonthlyBudgetVariance } from './entities/monthly-budget-variance.view-entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [TypeOrmModule.forFeature([MonthlyBudgetVariance])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
