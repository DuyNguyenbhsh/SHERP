import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { ProjectAssignment } from './entities/project-assignment.entity';
import { ProjectTransaction } from './entities/project-transaction.entity';
import { CostCategory } from './entities/cost-category.entity';
import { ProjectBudget } from './entities/project-budget.entity';
import { ProjectHistory } from './entities/project-history.entity';
import { ProjectWbs } from './entities/project-wbs.entity';
import { ProjectCbs } from './entities/project-cbs.entity';
import { ProjectBoqItem } from './entities/project-boq-item.entity';
import { ProjectBoqImport } from './entities/project-boq-import.entity';
import {
  ProjectSettlement,
  ProjectSettlementLine,
} from './entities/project-settlement.entity';
import { Employee } from '../users/entities/employee.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { ProjectHistoryService } from './project-history.service';
import { ProjectSubscriber } from './project.subscriber';
import { ProjectWbsService } from './project-wbs.service';
import { ProjectBoqService } from './project-boq.service';
import { ProjectEvmService } from './project-evm.service';
import { ProjectSettlementService } from './project-settlement.service';
import { DocumentsModule } from '../documents/documents.module';
import { ProjectRepository } from './infrastructure/repositories';
import { PROJECT_REPO } from './domain/ports';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      ProjectAssignment,
      ProjectTransaction,
      CostCategory,
      ProjectBudget,
      ProjectHistory,
      ProjectWbs,
      ProjectCbs,
      ProjectBoqItem,
      ProjectBoqImport,
      ProjectSettlement,
      ProjectSettlementLine,
      Employee,
      Organization,
      Supplier,
    ]),
    forwardRef(() => DocumentsModule),
  ],
  controllers: [ProjectsController],
  providers: [
    ProjectsService,
    ProjectHistoryService,
    ProjectSubscriber,
    ProjectWbsService,
    ProjectBoqService,
    ProjectEvmService,
    ProjectSettlementService,
    // Repository Pattern: Infrastructure → Domain Port
    { provide: PROJECT_REPO, useClass: ProjectRepository },
    ProjectRepository,
  ],
  exports: [ProjectsService, ProjectHistoryService, ProjectBoqService],
})
export class ProjectsModule {}
