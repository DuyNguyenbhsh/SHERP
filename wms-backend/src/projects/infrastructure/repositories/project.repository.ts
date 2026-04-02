import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { IProjectRepository } from '../../domain/ports';
import type {
  BudgetRow,
  ActualCostRow,
  EvmCbsAggregation,
  EvmActualCostAggregation,
  EvmWbsInput,
} from '../../domain/types';
import { ProjectBudget } from '../../entities/project-budget.entity';
import { ProjectTransaction } from '../../entities/project-transaction.entity';
import { ProjectWbs } from '../../entities/project-wbs.entity';
import { ProjectCbs } from '../../entities/project-cbs.entity';

@Injectable()
export class ProjectRepository implements IProjectRepository {
  constructor(
    @InjectRepository(ProjectBudget)
    private budgetRepo: Repository<ProjectBudget>,
    @InjectRepository(ProjectTransaction)
    private txRepo: Repository<ProjectTransaction>,
    @InjectRepository(ProjectWbs)
    private wbsRepo: Repository<ProjectWbs>,
    @InjectRepository(ProjectCbs)
    private cbsRepo: Repository<ProjectCbs>,
  ) {}

  async findBudgetRows(projectId: string): Promise<BudgetRow[]> {
    const rows = await this.budgetRepo
      .createQueryBuilder('b')
      .innerJoin('b.category', 'c')
      .select('b.category_id', 'category_id')
      .addSelect('c.code', 'code')
      .addSelect('c.name', 'name')
      .addSelect('b.planned_amount', 'planned')
      .where('b.project_id = :projectId', { projectId })
      .getRawMany();

    return rows.map((r) => ({
      category_id: r.category_id,
      code: r.code,
      name: r.name,
      planned: parseFloat(r.planned || '0'),
    }));
  }

  async findActualCostRows(projectId: string): Promise<ActualCostRow[]> {
    const rows = await this.txRepo
      .createQueryBuilder('t')
      .innerJoin('t.category', 'c')
      .select('t.category_id', 'category_id')
      .addSelect('c.code', 'code')
      .addSelect('c.name', 'name')
      .addSelect('SUM(t.amount)', 'total')
      .addSelect('COUNT(t.id)', 'count')
      .where('t.project_id = :projectId', { projectId })
      .groupBy('t.category_id')
      .addGroupBy('c.code')
      .addGroupBy('c.name')
      .orderBy('total', 'DESC')
      .getRawMany();

    return rows.map((r) => ({
      category_id: r.category_id,
      code: r.code,
      name: r.name,
      total: parseFloat(r.total || '0'),
      count: parseInt(r.count || '0', 10),
    }));
  }

  async findWbsNodesForEvm(projectId: string): Promise<EvmWbsInput[]> {
    const nodes = await this.wbsRepo.find({ where: { project_id: projectId } });
    return nodes.map((n) => ({
      id: n.id,
      code: n.code,
      name: n.name,
      progress_percent: Number(n.progress_percent),
    }));
  }

  async findCbsAggregations(projectId: string): Promise<EvmCbsAggregation[]> {
    const rows = await this.cbsRepo
      .createQueryBuilder('c')
      .select('c.wbs_id', 'wbs_id')
      .addSelect('SUM(c.planned_amount)', 'total_planned')
      .where('c.project_id = :projectId', { projectId })
      .groupBy('c.wbs_id')
      .getRawMany();

    return rows.map((r) => ({
      wbs_id: r.wbs_id,
      total_planned: parseFloat(r.total_planned || '0'),
    }));
  }

  async findActualCostByWbs(
    projectId: string,
  ): Promise<EvmActualCostAggregation[]> {
    const rows = await this.txRepo
      .createQueryBuilder('t')
      .select('t.wbs_id', 'wbs_id')
      .addSelect('SUM(t.amount)', 'total_actual')
      .where('t.project_id = :projectId', { projectId })
      .andWhere('t.wbs_id IS NOT NULL')
      .groupBy('t.wbs_id')
      .getRawMany();

    return rows.map((r) => ({
      wbs_id: r.wbs_id,
      total_actual: parseFloat(r.total_actual || '0'),
    }));
  }

  async findUnassignedActualCost(projectId: string): Promise<number> {
    const result = await this.txRepo
      .createQueryBuilder('t')
      .select('SUM(t.amount)', 'total')
      .where('t.project_id = :projectId', { projectId })
      .andWhere('t.wbs_id IS NULL')
      .getRawOne();

    return parseFloat(result?.total || '0');
  }
}
