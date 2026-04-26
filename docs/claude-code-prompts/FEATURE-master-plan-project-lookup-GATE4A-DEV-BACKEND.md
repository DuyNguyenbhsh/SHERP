# CLAUDE CODE CLI — LỆNH THỰC THI
## Gate 4A: Developer Implementation — BACKEND ONLY
## Feature: `master-plan-project-lookup`

---

## TECH ADVISOR DECISIONS — 3 UI Open Questions

| # | Quyết định |
|---|---|
| **UI-Q1** | ✅ Defer V2 — backlog ticket `UI-MPL-DROPDOWN-CONFLICT-HINT`. V1 chỉ trap 409 ở submit. |
| **UI-Q2** | ✅ Thêm `--warning` + `--success` token. (Frontend scope — Gate 4B) |
| **UI-Q3** | ✅ Focus input → hiện 20 project đầu. (Frontend scope — Gate 4B) |

---

## ROLE ASSIGNMENT

Bạn đóng vai **Backend Developer (NestJS)** cho SH-GROUP ERP. BẮT BUỘC đọc trước:

1. `CLAUDE.md` (root) — 6-Gate
2. `wms-backend/CLAUDE.md` — toàn bộ (đặc biệt §4 Architecture, §5 Migration, §7 Security, §9 Coding Standards, §11 Cross-Stack Sync)
3. `.claude/rules/dev-rules.md`
4. `docs/features/master-plan-project-lookup/BA_SPEC.md`
5. `docs/features/master-plan-project-lookup/SA_DESIGN.md` (bản đã revise — có C3 fix, C7 unaccent, f_unaccent wrapper)
6. `docs/features/master-plan-project-lookup/UI_SPEC.md` §8 Copy Catalog — chỉ đoạn error strings để backend map đúng message

---

## PRE-FLIGHT

```bash
cd D:\SHERP\SHERP
git branch --show-current       # phải in: feature/master-plan-project-lookup
git status                      # phải sạch
git log --oneline -5            # phải thấy: Gate 3 UI_SPEC → Gate 2.5 → Gate 2 → prompts → Gate 1 BA_SPEC
cd wms-backend
npm run build                   # verify BE hiện tại compile OK trước khi đụng
```

Nếu `npm run build` fail trước khi làm gì → DỪNG, báo cáo, không commit gì mới.

---

## SCOPE — CHỈ LÀM BACKEND. KHÔNG ĐỤNG FRONTEND.

### Files sẽ tạo mới

| File | Mục đích |
|---|---|
| `wms-backend/src/projects/dto/lookup-projects.dto.ts` | `LookupProjectsDto` (query), `LookupProjectItemDto` (response item), `LookupProjectsResponseDto` (wrapper) |
| `wms-backend/src/projects/project-lookup.service.ts` | `ProjectLookupService.search(dto, user)` |
| `wms-backend/src/projects/project-lookup.service.spec.ts` | 6 test cases theo SA §10.1 |
| `wms-backend/src/migrations/1776300000013-AddViewAllProjectsPrivilege.ts` | Seed privilege + f_unaccent wrapper + 4 index |
| `wms-backend/src/common/constants/error-messages.ts` | Bảng mapping error (BR-MPL-05) |

### Files sẽ sửa

| File | Thay đổi |
|---|---|
| `wms-backend/src/projects/enums/project.enum.ts` | Export `PROJECT_ACTIVE_STATUSES` (không đổi enum value) |
| `wms-backend/src/projects/projects.controller.ts` | Thêm `@Get('lookup')` **phía trên** `@Get(':id')` |
| `wms-backend/src/projects/projects.module.ts` | Register `ProjectLookupService` |
| `wms-backend/src/auth/enums/privilege.enum.ts` | Thêm `VIEW_ALL_PROJECTS` |
| `wms-backend/src/seed/seed.service.ts` | Thêm entry `VIEW_ALL_PROJECTS` vào `privilegesData[]` + assign cho SUPER_ADMIN |
| `wms-backend/src/master-plan/master-plan.service.ts` | Thêm private `calculateBudgetHeadroom()` + cross-org audit log trong `create()` |

### TUYỆT ĐỐI KHÔNG ĐỤNG

- Bất kỳ file nào trong `wms-frontend/` — scope Gate 4B.
- `wms-backend/src/index.css` — không tồn tại, chỉ lưu ý không nhầm với FE.
- Bất kỳ entity `.entity.ts` nào — SA_DESIGN §2.1 ghi rõ KHÔNG đổi schema.
- Bất kỳ migration cũ — chỉ tạo migration mới theo đúng tên trong SA_DESIGN.

---

## THỨ TỰ THỰC THI (NGHIÊM NGẶT)

### Step 1 — Tạo `error-messages.ts` constants

File: `wms-backend/src/common/constants/error-messages.ts`

Nội dung theo SA_DESIGN §8.1 (copy nguyên văn). Export default + named.

**Commit:**
```
git add wms-backend/src/common/constants/error-messages.ts
git commit -m "feat(common): add centralized Vietnamese error message constants

BR-MPL-05: map technical errors to Vietnamese business messages.
No tech leakage (UUID regex, stack trace, field names) to end-users.

Refs: #master-plan-project-lookup"
```

### Step 2 — Thêm privilege enum

File: `wms-backend/src/auth/enums/privilege.enum.ts`

Thêm `VIEW_ALL_PROJECTS = 'VIEW_ALL_PROJECTS'` trong nhóm PROJECT (giữ thứ tự alphabet hoặc cuối nhóm, tuân convention file hiện tại).

### Step 3 — Sửa seed service

File: `wms-backend/src/seed/seed.service.ts`

- Thêm entry vào `privilegesData[]`: `{ code: 'VIEW_ALL_PROJECTS', name: 'Xem toàn bộ dự án (bỏ qua filter tổ chức)', module: 'PROJECT' }`.
- Logic assign cho `SUPER_ADMIN` trong `onApplicationBootstrap` phải auto-pick up (verify đúng pattern hiện tại — nếu không tự động, thêm thủ công vào mapping role-privilege của SUPER_ADMIN).

**Commit Step 2 + 3 chung:**
```
git add wms-backend/src/auth/enums/privilege.enum.ts wms-backend/src/seed/seed.service.ts
git commit -m "feat(auth): add VIEW_ALL_PROJECTS privilege for cross-org project lookup

- New privilege bypasses org filter in GET /projects/lookup
- Seed service auto-assigns to SUPER_ADMIN on bootstrap
- Idempotent: re-running seed does not duplicate

Refs: #master-plan-project-lookup"
```

### Step 4 — Tạo migration

File: `wms-backend/src/migrations/1776300000013-AddViewAllProjectsPrivilege.ts`

Nội dung hợp nhất theo SA_DESIGN §2.3 (privilege seed) + Gate 2.5 addendum (f_unaccent wrapper + 4 index):

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddViewAllProjectsPrivilege1776300000013 implements MigrationInterface {
  name = 'AddViewAllProjectsPrivilege1776300000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create IMMUTABLE unaccent wrapper (must be IMMUTABLE to be indexable)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.f_unaccent(text) RETURNS text
        LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS $$
        SELECT public.unaccent('public.unaccent', $1);
      $$;
    `);

    // 2. Seed privilege (idempotent)
    await queryRunner.query(`
      INSERT INTO privileges (id, privilege_code, privilege_name, module, is_active, created_at, updated_at)
      VALUES (uuid_generate_v4(), 'VIEW_ALL_PROJECTS',
              'Xem toàn bộ dự án (bỏ qua filter tổ chức)', 'PROJECT', true, now(), now())
      ON CONFLICT (privilege_code) DO NOTHING;
    `);

    // 3. Indexes for lookup performance (SA_DESIGN §9.2)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_code_lower
        ON projects (LOWER(project_code));
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_status_active
        ON projects (status) WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_org_status
        ON projects (organization_id, status) WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_name_unaccent_trgm
        ON projects USING gin (public.f_unaccent(LOWER(project_name)) gin_trgm_ops);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_projects_name_unaccent_trgm;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_projects_org_status;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_projects_status_active;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_projects_code_lower;`);
    await queryRunner.query(`DELETE FROM privileges WHERE privilege_code = 'VIEW_ALL_PROJECTS';`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS public.f_unaccent(text);`);
  }
}
```

**KHÔNG CHẠY `npm run migration:run`** trong session này — chỉ tạo file. DevOps chạy lúc deploy.

**Verify compile:**
```bash
cd wms-backend && npm run build
```

**Commit:**
```
git add wms-backend/src/migrations/1776300000013-AddViewAllProjectsPrivilege.ts
git commit -m "feat(db): add VIEW_ALL_PROJECTS privilege migration + lookup indexes

Migration 1776300000013:
- Create f_unaccent() IMMUTABLE wrapper (required for indexable unaccent)
- Seed VIEW_ALL_PROJECTS privilege (idempotent ON CONFLICT DO NOTHING)
- Add 4 indexes for /projects/lookup performance:
  * idx_projects_code_lower (code prefix match)
  * idx_projects_status_active (partial, non-deleted)
  * idx_projects_org_status (composite non-admin filter)
  * idx_projects_name_unaccent_trgm (GIN pg_trgm, accent-insensitive)

Down migration fully reverses all changes.

Refs: #master-plan-project-lookup"
```

### Step 5 — Export PROJECT_ACTIVE_STATUSES

File: `wms-backend/src/projects/enums/project.enum.ts`

Thêm export const (không đổi enum):

```typescript
export const PROJECT_ACTIVE_STATUSES: readonly ProjectStatus[] = [
  ProjectStatus.WON_BID,
  ProjectStatus.ACTIVE,
  ProjectStatus.ON_HOLD,
  ProjectStatus.SETTLING,
  ProjectStatus.WARRANTY,
] as const;
```

### Step 6 — Tạo DTOs

File: `wms-backend/src/projects/dto/lookup-projects.dto.ts`

Theo SA_DESIGN §3.1.1, §3.1.3. Bao gồm 3 class:

- `LookupProjectsDto` — request query (`@IsOptional q`, `@IsInt limit`, `@IsInt offset`, `@IsArray status_whitelist` với `@Transform` parse CSV).
- `LookupProjectItemDto` — 1 project item trong response.
- `LookupProjectsResponseDto` — wrapper `{ items, total, limit, offset }`.

**Validation quan trọng:**
- `q`: `@MaxLength(100)` + `@Matches(/^[\p{L}\p{N}\s\-._]*$/u)` + message VI: `'Tham số tìm kiếm không hợp lệ.'`
- `limit`: `@Min(1) @Max(50)`, default 20.
- `offset`: `@Min(0)`, default 0.
- `status_whitelist`: `@IsEnum(ProjectStatus, { each: true })`.

Swagger `@ApiProperty`/`@ApiPropertyOptional` đầy đủ với example Việt ngữ.

### Step 7 — Tạo ProjectLookupService

File: `wms-backend/src/projects/project-lookup.service.ts`

Implement đúng pseudo-code SA_DESIGN §6.1 (bản đã revise):

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { LookupProjectsDto } from './dto/lookup-projects.dto';
import { PROJECT_ACTIVE_STATUSES } from './enums/project.enum';

interface AuthenticatedUserCtx {
  privileges: string[];
  contexts: string[];
}

@Injectable()
export class ProjectLookupService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  async search(dto: LookupProjectsDto, user: AuthenticatedUserCtx) {
    const statuses = dto.status_whitelist ?? PROJECT_ACTIVE_STATUSES;
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
        // Anti-leak: no contexts → no results
        qb.andWhere('1=0');
      } else {
        qb.andWhere('p.organization_id IN (:...contexts)', { contexts: userContexts });
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

    const [rows, total] = await qb.getManyAndCount();

    return {
      message: 'Thành công',
      data: {
        items: rows.map((p) => ({
          id: p.id,
          project_code: p.project_code,
          project_name: p.project_name,
          status: p.status,
          stage: p.stage,
          organization_id: p.organization_id ?? null,
          organization_name: (p as any).organization?.organization_name ?? null,
        })),
        total,
        limit,
        offset,
      },
    };
  }
}
```

### Step 8 — Register service trong module

File: `wms-backend/src/projects/projects.module.ts`

Thêm `ProjectLookupService` vào `providers[]` và `exports[]`.

### Step 9 — Thêm controller endpoint

File: `wms-backend/src/projects/projects.controller.ts`

Thêm method `lookup()` **BẮT BUỘC phía trên** `findOne(@Param('id'))` để Nest route resolver không match `/projects/lookup` thành `id=lookup`:

```typescript
@Get('lookup')
@RequirePrivilege('VIEW_PROJECTS', 'VIEW_ALL_PROJECTS')  // OR logic — guard dùng .some()
@ApiOperation({ summary: 'Tìm kiếm dự án (LOV) cho picker UI' })
@ApiResponse({ status: 200, type: LookupProjectsResponseDto })
async lookup(
  @Query() dto: LookupProjectsDto,
  @Req() req: AuthenticatedRequest,
) {
  return this.projectLookupService.search(dto, req.user);
}
```

Inject `ProjectLookupService` qua constructor.

**Verify `@RequirePrivilege` decorator hiện tại**: đọc `auth/decorators/require-privilege.decorator.ts` xem có hỗ trợ OR (nhiều privilege = pass nếu có 1) chưa. Nếu chưa → flag cho Tech Advisor (không tự sửa decorator, fallback dùng `@RequirePrivilege('VIEW_PROJECTS')` và check `VIEW_ALL_PROJECTS` trong service).

### Step 10 — Update MasterPlanService

File: `wms-backend/src/master-plan/master-plan.service.ts`

Thêm 2 phần:

**10.1 Private method `calculateBudgetHeadroom`** (theo SA_DESIGN §8.3):

```typescript
private async calculateBudgetHeadroom(projectId: string): Promise<bigint> {
  const project = await this.projectRepo.findOneBy({ id: projectId });
  if (!project) return 0n;
  const raw = await this.planRepo
    .createQueryBuilder('mp')
    .select('COALESCE(SUM(mp.budget_vnd::bigint), 0)', 'sum')
    .where('mp.project_id = :pid', { pid: projectId })
    .andWhere('mp.status != :closed', { closed: MasterPlanStatus.CLOSED })
    .getRawOne<{ sum: string }>();
  return BigInt(project.budget ?? 0) - BigInt(raw?.sum ?? '0');
}
```

**10.2 Cross-org audit log** trong `create()` — sau khi `save(plan)` thành công:

```typescript
const actorContexts: string[] = user.contexts ?? [];
const crossOrg = project.organization_id
  ? !actorContexts.includes(project.organization_id)
  : false;

if (crossOrg) {
  await this.auditLogService.log({
    action: AuditAction.CREATE,
    entityName: 'MasterPlan',
    entityId: saved.id,
    reason: 'CREATE_MASTER_PLAN_CROSS_ORG',
    newData: {
      project_id: saved.project_id,
      project_org_id: project.organization_id,
      actor_contexts: actorContexts,
    },
  });
}

// Budget warning (soft)
const headroom = await this.calculateBudgetHeadroom(saved.project_id);
const warning = BigInt(saved.budget_vnd ?? 0) > headroom;
return {
  message: 'Đã tạo Master Plan.',
  data: saved,
  warning: warning || undefined,
  headroom: warning ? headroom.toString() : undefined,
};
```

**Verify imports:**
- `Project` repo phải inject được trong `MasterPlanService`. Nếu chưa → thêm `@InjectRepository(Project)` trong constructor và thêm vào `MasterPlanModule.imports[TypeOrmModule.forFeature([..., Project])]`.
- `AuditLogService` + `AuditAction` enum phải import từ `common/audit/`.

**KHÔNG đụng `MasterPlanService.approve()`** — BR-MP-04 hard-block giữ nguyên.

### Step 11 — Unit tests ProjectLookupService

File: `wms-backend/src/projects/project-lookup.service.spec.ts`

6 test case theo SA_DESIGN §10.1:

1. **Search match code** — seed `JDHP001/JDHP002/OTHER001`, `q='jdhp'` → 2 items, `JDHP001` first.
2. **Empty result** — user org khác, no `VIEW_ALL_PROJECTS` → `items=[]`, `total=0`, không throw.
3. **Pagination** — seed 30, `limit=20, offset=0` → 20; `offset=20` → 10; `total=30`.
4. **Privilege bypass** — user `VIEW_ALL_PROJECTS` ở org A, seed 2 orgA + 3 orgB → trả đủ 5.
5. **Status filter** — seed 5 project 5 status khác nhau, default whitelist → chỉ những status trong `PROJECT_ACTIVE_STATUSES`.
6. **SQL injection safety** — `q="'; DROP TABLE projects;--"` ValidationPipe reject 400 (test qua e2e hoặc unit test validation).

Dùng `@nestjs/testing` + mock `Repository<Project>` với jest. Không cần Postgres thật — mock `createQueryBuilder` chain.

### Step 12 — Verify & Commit

```bash
cd wms-backend
npm run build                           # compile pass
npm run lint                            # eslint pass
npm run test -- project-lookup          # 6 tests pass
npm run test -- master-plan             # không regress
```

Nếu bất cứ command nào fail → fix trước khi commit. Không commit code không pass.

**Commit cuối (combine Step 5-11):**
```bash
git add wms-backend/src/projects/ wms-backend/src/master-plan/ 
git commit -m "feat(projects,master-plan): implement /projects/lookup endpoint + cross-org audit

Backend implementation for master-plan-project-lookup feature:

Projects module:
- Add ProjectLookupService.search() with accent-insensitive query
- Filter by user.contexts[] (IN), bypass with VIEW_ALL_PROJECTS privilege
- Anti-leak: empty contexts → empty result (no 403 leak)
- Export PROJECT_ACTIVE_STATUSES constant
- Add GET /projects/lookup endpoint (above /projects/:id route)
- 6 unit tests covering search/pagination/privilege/status/injection

Master Plan module:
- Add calculateBudgetHeadroom() private helper (V1 uses project.budget)
- Soft budget warning in create() response (non-blocking, UI shows banner)
- Audit log cross-org creation with actor_contexts snapshot

Cross-stack: DTOs shape-match SA_DESIGN §3.1. Frontend sync in Gate 4B.

Refs: #master-plan-project-lookup
Gate-4A-Ready-For-Review: true"
```

---

## BÁO CÁO KẾT THÚC GATE 4A

Format:

```
GATE 4A COMPLETE — READY FOR TECH ADVISOR REVIEW

Branch: feature/master-plan-project-lookup
Commits added (newest first):
1. <hash> feat(projects,master-plan): ...
2. <hash> feat(db): add migration ...
3. <hash> feat(auth): add VIEW_ALL_PROJECTS privilege ...
4. <hash> feat(common): add Vietnamese error messages ...

Build status:
- npm run build: PASS
- npm run lint: PASS (0 errors, X warnings)
- npm run test -- project-lookup: 6 passed
- npm run test -- master-plan: all existing tests still pass

Files created/modified:
[list with line counts]

Cross-stack contract (for Gate 4B frontend implementation):
- Endpoint: GET /projects/lookup
- Query DTO: LookupProjectsDto { q?, limit?=20, offset?=0, status_whitelist?[] }
- Response: { status: true, message, data: { items: LookupProjectItemDto[], total, limit, offset } }
- Item shape: { id, project_code, project_name, status, stage, organization_id, organization_name }

Open Concerns (if any):
- [list any technical surprise encountered]

Next: Gate 4B (Frontend implementation) — awaiting Tech Advisor approval.
```

---

## TUYỆT ĐỐI KHÔNG ĐƯỢC

- **KHÔNG đụng `wms-frontend/`** bất kỳ file nào.
- KHÔNG chạy `npm run migration:run` (DevOps chạy lúc deploy).
- KHÔNG push lên remote.
- KHÔNG sửa entity `.entity.ts` (schema không đổi).
- KHÔNG commit code nếu `npm run build` / `npm run test` fail.
- KHÔNG tự sang Gate 4B.
- KHÔNG thay đổi bất kỳ quyết định nào trong SA_DESIGN đã duyệt.

---

## MA TRẬN PHÂN LOẠI THAY ĐỔI — NHẮC LẠI

Task này = **Feature / UX redesign** → đang Gate 4. Sau Gate 4A (BE) sẽ có Gate 4B (FE), Gate 5 (QA), Gate 6 (Deploy).

---

**Bắt đầu từ Pre-flight. Cam kết: không commit bất kỳ bước nào nếu build/test fail.**
