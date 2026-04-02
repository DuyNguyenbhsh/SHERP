import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import {
  calculateEvmPerWbs,
  calculateEvmSummary,
  buildCbsMap,
  buildActualCostMap,
} from './domain/logic';
import { PROJECT_REPO, type IProjectRepository } from './domain/ports';

@Injectable()
export class ProjectEvmService {
  constructor(
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
    @Inject(PROJECT_REPO)
    private projectRepository: IProjectRepository,
  ) {}

  async getEarnedValueAnalysis(projectId: string) {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });
    if (!project)
      throw new NotFoundException({
        status: 'error',
        message: 'Dự án không tồn tại!',
        data: null,
      });

    // Infrastructure: data retrieval via repository port
    const [wbsNodes, cbsRows, acRows, unassignedAc] = await Promise.all([
      this.projectRepository.findWbsNodesForEvm(projectId),
      this.projectRepository.findCbsAggregations(projectId),
      this.projectRepository.findActualCostByWbs(projectId),
      this.projectRepository.findUnassignedActualCost(projectId),
    ]);

    // Domain logic: pure calculation
    const cbsMap = buildCbsMap(cbsRows);
    const acMap = buildActualCostMap(acRows);
    const rows = calculateEvmPerWbs(wbsNodes, cbsMap, acMap);
    const analysis = calculateEvmSummary(rows, unassignedAc);

    return {
      status: 'success',
      message: 'Phân tích Earned Value',
      data: analysis,
    };
  }
}
