import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import {
  LookupProjectItemDto,
  LookupProjectsDto,
} from './dto/lookup-projects.dto';
import { PROJECT_ACTIVE_STATUSES } from './enums/project.enum';

/**
 * Context user cần cho filter RBAC. Shape khớp AuthenticatedRequest.user
 * (wms-backend/src/auth/types/authenticated-request.ts:4-13).
 */
export interface ProjectLookupUserContext {
  privileges: string[];
  contexts: string[];
}

interface ProjectLookupRow {
  id: string;
  project_code: string;
  project_name: string;
  status: Project['status'];
  stage: Project['stage'];
  organization_id: string | null;
  organization?: { organization_name: string | null } | null;
}

@Injectable()
export class ProjectLookupService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  /**
   * Tìm kiếm dự án cho LOV picker (SA_DESIGN §6.1).
   * - Filter status whitelist (mặc định PROJECT_ACTIVE_STATUSES).
   * - RBAC: bypass org filter nếu user có VIEW_ALL_PROJECTS; ngược lại
   *   filter theo user.contexts[] (nếu contexts rỗng → trả empty, anti-leak).
   * - Search `q`: LIKE trên LOWER(project_code) + f_unaccent(LOWER(project_name)).
   * - Order: code prefix match trước, rồi project_code ASC.
   */
  async search(
    dto: LookupProjectsDto,
    user: ProjectLookupUserContext,
  ): Promise<{
    message: string;
    data: {
      items: LookupProjectItemDto[];
      total: number;
      limit: number;
      offset: number;
    };
  }> {
    const statuses =
      dto.status_whitelist && dto.status_whitelist.length > 0
        ? dto.status_whitelist
        : PROJECT_ACTIVE_STATUSES;

    const bypassOrgFilter = user.privileges.includes('VIEW_ALL_PROJECTS');
    const userContexts = user.contexts ?? [];
    const limit = Math.min(dto.limit ?? 20, 50);
    const offset = dto.offset ?? 0;
    const qTerm = dto.q?.trim().toLowerCase();

    const qb = this.projectRepo
      .createQueryBuilder('p')
      .leftJoin('p.organization', 'o')
      .select([
        'p.id',
        'p.project_code',
        'p.project_name',
        'p.status',
        'p.stage',
        'p.organization_id',
        'o.organization_name',
      ])
      .where('p.status IN (:...statuses)', { statuses })
      .andWhere('p.deleted_at IS NULL');

    if (!bypassOrgFilter) {
      if (userContexts.length === 0) {
        // Anti-leak: user không có context nào → trả rỗng, không throw 403.
        qb.andWhere('1=0');
      } else {
        qb.andWhere('p.organization_id IN (:...contexts)', {
          contexts: userContexts,
        });
      }
    }

    if (qTerm && qTerm.length >= 2) {
      qb.andWhere(
        `(
          LOWER(p.project_code) LIKE :qPattern
          OR public.f_unaccent(LOWER(p.project_name)) LIKE public.f_unaccent(:qPattern)
        )`,
        { qPattern: `%${qTerm}%` },
      );
      qb.setParameter('qPrefix', `${qTerm}%`);
      qb.orderBy(
        `CASE WHEN LOWER(p.project_code) LIKE :qPrefix THEN 0 ELSE 1 END`,
        'ASC',
      ).addOrderBy('p.project_code', 'ASC');
    } else {
      qb.orderBy('p.project_code', 'ASC');
    }

    qb.skip(offset).take(limit);

    const [rows, total] = (await qb.getManyAndCount()) as [
      ProjectLookupRow[],
      number,
    ];

    const items: LookupProjectItemDto[] = rows.map((p) => ({
      id: p.id,
      project_code: p.project_code,
      project_name: p.project_name,
      status: p.status,
      stage: p.stage,
      organization_id: p.organization_id ?? null,
      organization_name: p.organization?.organization_name ?? null,
    }));

    return {
      message: 'Thành công',
      data: { items, total, limit, offset },
    };
  }
}
