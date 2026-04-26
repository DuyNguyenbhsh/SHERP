/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectLookupService } from './project-lookup.service';
import { Project } from './entities/project.entity';
import { ProjectStage, ProjectStatus } from './enums/project.enum';
import { LookupProjectsDto } from './dto/lookup-projects.dto';

// ── Helper: create mock project rows (shape khớp select list của service) ──
interface MockRow {
  id: string;
  project_code: string;
  project_name: string;
  status: ProjectStatus;
  stage: ProjectStage;
  organization_id: string | null;
  organization: { organization_name: string | null } | null;
}

function makeProject(overrides: Partial<MockRow> = {}): MockRow {
  return {
    id: 'uuid-1',
    project_code: 'JDHP001',
    project_name: 'Dự án JDHP Hà Nội',
    status: ProjectStatus.ACTIVE,
    stage: ProjectStage.CONSTRUCTION,
    organization_id: 'org-A',
    organization: { organization_name: 'Phòng Kỹ thuật' },
    ...overrides,
  };
}

// ── Helper: mock QueryBuilder với capture state ──
interface QbState {
  wheres: Array<{ sql: string; params?: Record<string, unknown> }>;
  orderBys: Array<{ sql: string; order?: 'ASC' | 'DESC' }>;
  skip?: number;
  take?: number;
  params: Record<string, unknown>;
  rows: MockRow[];
  total: number;
}

function createMockQb(state: QbState): any {
  const qb: any = {
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn((sql: string, params?: Record<string, unknown>) => {
      state.wheres.push({ sql, params });
      Object.assign(state.params, params ?? {});
      return qb;
    }),
    andWhere: jest.fn((sql: string, params?: Record<string, unknown>) => {
      state.wheres.push({ sql, params });
      Object.assign(state.params, params ?? {});
      return qb;
    }),
    orderBy: jest.fn((sql: string, order?: 'ASC' | 'DESC') => {
      state.orderBys.push({ sql, order });
      return qb;
    }),
    addOrderBy: jest.fn((sql: string, order?: 'ASC' | 'DESC') => {
      state.orderBys.push({ sql, order });
      return qb;
    }),
    setParameter: jest.fn((key: string, value: unknown) => {
      state.params[key] = value;
      return qb;
    }),
    skip: jest.fn((n: number) => {
      state.skip = n;
      return qb;
    }),
    take: jest.fn((n: number) => {
      state.take = n;
      return qb;
    }),
    getManyAndCount: jest
      .fn()
      .mockImplementation(() => Promise.resolve([state.rows, state.total])),
  };
  return qb;
}

describe('ProjectLookupService', () => {
  let service: ProjectLookupService;
  let qbState: QbState;

  const setupQb = (rows: MockRow[], total?: number): void => {
    qbState = {
      wheres: [],
      orderBys: [],
      params: {},
      rows,
      total: total ?? rows.length,
    };
  };

  beforeEach(async () => {
    setupQb([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectLookupService,
        {
          provide: getRepositoryToken(Project),
          useValue: {
            createQueryBuilder: jest.fn(() => createMockQb(qbState)),
          },
        },
      ],
    }).compile();

    service = module.get<ProjectLookupService>(ProjectLookupService);
  });

  // Test case 1: Search match code
  it('TC1 — matches by project code, code prefix ranks first', async () => {
    setupQb([
      makeProject({ id: 'u1', project_code: 'JDHP001' }),
      makeProject({ id: 'u2', project_code: 'JDHP002' }),
    ]);

    const result = await service.search({ q: 'jdhp' } as LookupProjectsDto, {
      privileges: ['VIEW_PROJECTS'],
      contexts: ['org-A'],
    });

    expect(result.data.items).toHaveLength(2);
    expect(result.data.items[0].project_code).toBe('JDHP001');
    // Verify search WHERE applied
    const searchWhere = qbState.wheres.find((w) =>
      w.sql.includes('f_unaccent'),
    );
    expect(searchWhere).toBeDefined();
    expect(qbState.params.qPattern).toBe('%jdhp%');
    expect(qbState.params.qPrefix).toBe('jdhp%');
    // Code-prefix order clause added
    const prefixOrder = qbState.orderBys.find((o) => o.sql.includes('qPrefix'));
    expect(prefixOrder).toBeDefined();
  });

  // Test case 2: Empty result (user org khác, không VIEW_ALL_PROJECTS)
  it('TC2 — returns empty (anti-leak) when user has non-matching context', async () => {
    setupQb([], 0);

    const result = await service.search({ q: 'jdhp' } as LookupProjectsDto, {
      privileges: ['VIEW_PROJECTS'],
      contexts: ['org-X'],
    });

    expect(result.data.items).toEqual([]);
    expect(result.data.total).toBe(0);
    // Verify IN clause with user contexts applied
    const inClause = qbState.wheres.find((w) =>
      w.sql.includes('organization_id IN'),
    );
    expect(inClause).toBeDefined();
    expect(qbState.params.contexts).toEqual(['org-X']);
  });

  // Test case 2b: Empty contexts → anti-leak 1=0
  it('TC2b — applies 1=0 when user has empty contexts and no VIEW_ALL_PROJECTS', async () => {
    setupQb([], 0);

    await service.search({} as LookupProjectsDto, {
      privileges: ['VIEW_PROJECTS'],
      contexts: [],
    });

    const antiLeak = qbState.wheres.find((w) => w.sql.includes('1=0'));
    expect(antiLeak).toBeDefined();
  });

  // Test case 3: Pagination
  it('TC3 — applies limit and offset correctly', async () => {
    setupQb(
      new Array(20).fill(null).map((_, i) => makeProject({ id: `u${i}` })),
      30,
    );

    const result = await service.search(
      { limit: 20, offset: 0 } as LookupProjectsDto,
      { privileges: ['VIEW_ALL_PROJECTS'], contexts: [] },
    );

    expect(result.data.items).toHaveLength(20);
    expect(result.data.total).toBe(30);
    expect(result.data.limit).toBe(20);
    expect(result.data.offset).toBe(0);
    expect(qbState.skip).toBe(0);
    expect(qbState.take).toBe(20);
  });

  // Test case 3b: Pagination clamp
  it('TC3b — clamps limit to max 50', async () => {
    setupQb([], 0);

    await service.search({ limit: 999 } as LookupProjectsDto, {
      privileges: ['VIEW_ALL_PROJECTS'],
      contexts: [],
    });

    expect(qbState.take).toBe(50);
  });

  // Test case 4: Privilege bypass
  it('TC4 — VIEW_ALL_PROJECTS bypasses org filter (no IN (...contexts) added)', async () => {
    setupQb(
      [
        makeProject({ id: 'u1', organization_id: 'org-A' }),
        makeProject({ id: 'u2', organization_id: 'org-A' }),
        makeProject({ id: 'u3', organization_id: 'org-B' }),
        makeProject({ id: 'u4', organization_id: 'org-B' }),
        makeProject({ id: 'u5', organization_id: 'org-B' }),
      ],
      5,
    );

    const result = await service.search({} as LookupProjectsDto, {
      privileges: ['VIEW_PROJECTS', 'VIEW_ALL_PROJECTS'],
      contexts: ['org-A'],
    });

    expect(result.data.items).toHaveLength(5);
    expect(result.data.total).toBe(5);
    // No IN (...contexts) clause added when bypass
    const orgClause = qbState.wheres.find((w) =>
      w.sql.includes('organization_id IN'),
    );
    expect(orgClause).toBeUndefined();
    // No anti-leak either
    const antiLeak = qbState.wheres.find((w) => w.sql.includes('1=0'));
    expect(antiLeak).toBeUndefined();
  });

  // Test case 5: Status filter — default uses PROJECT_ACTIVE_STATUSES
  it('TC5 — default status filter uses PROJECT_ACTIVE_STATUSES whitelist', async () => {
    setupQb([], 0);

    await service.search({} as LookupProjectsDto, {
      privileges: ['VIEW_ALL_PROJECTS'],
      contexts: [],
    });

    const statusClause = qbState.wheres.find((w) =>
      w.sql.includes('p.status IN'),
    );
    expect(statusClause).toBeDefined();
    const statuses = qbState.params.statuses as ProjectStatus[];
    expect(statuses).toEqual(
      expect.arrayContaining([
        ProjectStatus.WON_BID,
        ProjectStatus.ACTIVE,
        ProjectStatus.ON_HOLD,
        ProjectStatus.SETTLING,
        ProjectStatus.WARRANTY,
      ]),
    );
    // Exclude SETTLED, CANCELED, DRAFT, BIDDING, LOST_BID, RETENTION_RELEASED
    expect(statuses).not.toContain(ProjectStatus.SETTLED);
    expect(statuses).not.toContain(ProjectStatus.CANCELED);
    expect(statuses).not.toContain(ProjectStatus.DRAFT);
  });

  // Test case 5b: Status filter override
  it('TC5b — explicit status_whitelist overrides default', async () => {
    setupQb([], 0);

    await service.search(
      {
        status_whitelist: [ProjectStatus.DRAFT, ProjectStatus.CANCELED],
      } as LookupProjectsDto,
      { privileges: ['VIEW_ALL_PROJECTS'], contexts: [] },
    );

    const statuses = qbState.params.statuses as ProjectStatus[];
    expect(statuses).toEqual([ProjectStatus.DRAFT, ProjectStatus.CANCELED]);
  });

  // Test case 6: SQL injection safety — parameterized
  it('TC6 — uses parameterized queries for q (no raw concatenation)', async () => {
    setupQb([], 0);

    await service.search({ q: 'jdhp' } as LookupProjectsDto, {
      privileges: ['VIEW_ALL_PROJECTS'],
      contexts: [],
    });

    const searchWhere = qbState.wheres.find((w) =>
      w.sql.includes('f_unaccent'),
    );
    expect(searchWhere).toBeDefined();
    // SQL uses :qPattern placeholder, NOT raw concatenation
    expect(searchWhere?.sql).toContain(':qPattern');
    expect(searchWhere?.sql).not.toMatch(/LIKE\s+'%[a-z]/i);
    // Params bound via TypeORM parameterized — no manual escaping
    expect(qbState.params.qPattern).toBe('%jdhp%');
  });

  // Test case 6b: Short q (< 2 chars) skips search filter
  it('TC6b — short query (< 2 chars) does not apply search filter', async () => {
    setupQb([], 0);

    await service.search({ q: 'a' } as LookupProjectsDto, {
      privileges: ['VIEW_ALL_PROJECTS'],
      contexts: [],
    });

    const searchWhere = qbState.wheres.find((w) =>
      w.sql.includes('f_unaccent'),
    );
    expect(searchWhere).toBeUndefined();
  });
});
