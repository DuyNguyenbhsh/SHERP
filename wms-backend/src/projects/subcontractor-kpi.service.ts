import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubcontractorKpi } from './entities/subcontractor-kpi.entity';
import { CreateSubcontractorKpiDto } from './dto/create-subcontractor-kpi.dto';

@Injectable()
export class SubcontractorKpiService {
  constructor(
    @InjectRepository(SubcontractorKpi)
    private readonly repo: Repository<SubcontractorKpi>,
  ) {}

  async create(
    supplierId: string,
    dto: CreateSubcontractorKpiDto,
  ): Promise<SubcontractorKpi> {
    const totalScore = this.calculateScore(dto.criteria);
    const result = totalScore >= 60 ? 'PASS' : 'FAIL';

    const kpi = this.repo.create({
      ...dto,
      supplier_id: supplierId,
      total_score: totalScore,
      result,
    });
    return this.repo.save(kpi);
  }

  async findBySupplierId(supplierId: string): Promise<SubcontractorKpi[]> {
    return this.repo.find({
      where: { supplier_id: supplierId },
      relations: ['project', 'approver'],
      order: { evaluation_date: 'DESC' },
    });
  }

  async findLatest(supplierId: string): Promise<SubcontractorKpi | null> {
    return this.repo.findOne({
      where: { supplier_id: supplierId },
      relations: ['project', 'approver'],
      order: { evaluation_date: 'DESC' },
    });
  }

  async approve(kpiId: string, userId: string): Promise<SubcontractorKpi> {
    const kpi = await this.repo.findOne({ where: { id: kpiId } });
    if (!kpi) throw new NotFoundException('Danh gia KPI khong ton tai');
    kpi.approved_by = userId;
    kpi.approved_at = new Date();
    return this.repo.save(kpi);
  }

  async findFailed(): Promise<SubcontractorKpi[]> {
    return this.repo.find({
      where: { result: 'FAIL' },
      relations: ['supplier', 'project'],
      order: { evaluation_date: 'DESC' },
    });
  }

  private calculateScore(
    criteria: { weight: number; score: number; max_score: number }[],
  ): number {
    const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
    if (totalWeight === 0) return 0;
    const weightedScore = criteria.reduce(
      (sum, c) => sum + (c.score / c.max_score) * c.weight,
      0,
    );
    return Math.round((weightedScore / totalWeight) * 100 * 100) / 100;
  }
}
