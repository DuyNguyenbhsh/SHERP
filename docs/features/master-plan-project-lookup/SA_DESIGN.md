# SA_DESIGN — Feature: `master-plan-project-lookup`

> **Gate:** 2 (System & Software Architecture)
> **Ngày thiết kế:** 2026-04-22
> **Trạng thái:** DRAFT — chờ Tech Advisor duyệt
> **Tham chiếu:**
> - `.claude/rules/sa-rules.md` — tiêu chuẩn SA
> - `docs/features/master-plan-project-lookup/BA_SPEC.md` — Gate 1
> - `wms-backend/CLAUDE.md` §4 (Architecture), §5 (Migration), §7 (Security), §11 (Cross-Stack Sync)
> - `wms-frontend/CLAUDE.md` — Feature-Sliced Design

---

## 1. Executive Summary

Thiết kế endpoint `GET /projects/lookup` (light-weight LOV) + `<EntityPicker>` 2-tier thay thế text input UUID thô trong `MasterPlanFormDialog`. Không đổi schema nghiệp vụ; chỉ seed 1 privilege mới `VIEW_ALL_PROJECTS` để bypass filter tổ chức. V1 filter exact match `organization_id = user.organization_id`; V2 subtree tổ chức backlog hóa (ticket `ORG-HIERARCHY-VISIBILITY`). Budget hard-block vẫn giữ ở `MasterPlanService.approve()`; bước `create` trả warning non-blocking (BR-MPL-04). Error message Việt ngữ tập trung ở `common/constants/error-messages.ts` (BR-MPL-05). Mục tiêu P95 < 300ms ở 10k projects, đạt bằng index `LOWER(project_code)` ship V1 + `pg_trgm` GIN ship sau khi đo metric. Frontend thêm `cmdk` + shadcn `<Command>` (chưa có trong dependencies — phải add), wrap thành `EntityPicker` (generic) + `ProjectPicker` (pre-configured).

---

## 2. Entity & Database Schema changes

### 2.1 Schema `projects` / `master_plans`
**Không đổi.** Tất cả cột dùng lại: `id`, `project_code`, `project_name`, `status`, `stage`, `organization_id`, `organization.organization_name`.

### 2.2 ERD — quan hệ sử dụng (read-only)

```
projects
  ├── id (PK, uuid)
  ├── project_code (uk, varchar 50)
  ├── project_name (varchar 255)
  ├── status (varchar 30) — ProjectStatus enum
  ├── stage (varchar 30) — ProjectStage enum
  ├── organization_id (FK → organizations.id, nullable)
  └── deleted_at (soft delete)

organizations
  ├── id (PK, uuid)
  ├── organization_name
  └── parent_id (FK self, nullable) — sẵn cho V2 subtree

privileges (seed mới)
  └── VIEW_ALL_PROJECTS
```

### 2.3 Migration mới (chỉ seed, không đổi cấu trúc)

**Tên file:** `wms-backend/src/migrations/1776300000013-AddViewAllProjectsPrivilege.ts`

**Nội dung dự kiến (không tạo file code `.ts` ở gate này — chỉ ghi nội dung để Dev dùng lại nguyên văn):**

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddViewAllProjectsPrivilege1776300000013 implements MigrationInterface {
  name = 'AddViewAllProjectsPrivilege1776300000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO privileges (id, privilege_code, privilege_name, module, is_active, created_at, updated_at)
       VALUES (uuid_generate_v4(), 'VIEW_ALL_PROJECTS',
               'Xem toàn bộ dự án (bỏ qua filter tổ chức)', 'PROJECT', true, now(), now())
       ON CONFLICT (privilege_code) DO NOTHING`,
    );
    // SeedService.onApplicationBootstrap() sẽ auto-assign privilege mới
    // cho role SUPER_ADMIN (logic phần 2 trong seed.service.ts:192-216).
    // KHÔNG gán thủ công ở đây để tránh double-grant.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM privileges WHERE privilege_code = 'VIEW_ALL_PROJECTS'`,
    );
  }
}
```

**Lưu ý integrity:** Migration chỉ `INSERT ... ON CONFLICT DO NOTHING` → idempotent, chạy lại không lỗi. `down()` xóa cứng theo `privilege_code` (không có FK RESTRICT từ role_privileges vì seed service dùng cascade/rebuild).

### 2.4 Bổ sung enum Frontend + Backend (để type-safe)

**Backend:** `wms-backend/src/auth/enums/privilege.enum.ts` — thêm dòng:
```typescript
VIEW_ALL_PROJECTS = 'VIEW_ALL_PROJECTS',
```
Đặt trong nhóm `PROJECT`.

**Frontend:** nếu có enum mirror (hiện `shared/constants/privileges.ts` chưa chắc có — verify ở Gate 4), thêm tương ứng. Nếu chưa có thì Dev tạo mới.

---

## 3. API Endpoints — OpenAPI Contract

### 3.1 `GET /projects/lookup`

| Thuộc tính | Giá trị |
|---|---|
| **Method** | `GET` |
| **Path** | `/projects/lookup` (phải đặt TRƯỚC `@Get(':id')` trong `ProjectsController`) |
| **Auth** | `@UseGuards(JwtAuthGuard, PrivilegeGuard)` |
| **Privilege** | `@RequirePrivilege('VIEW_PROJECTS', 'VIEW_ALL_PROJECTS')` — OR logic (guard dùng `.some()`) |
| **Tags Swagger** | `Projects - Quản lý Dự án` |

#### 3.1.1 Query parameters (LookupProjectsDto)

| Param | Type | Default | Validation | Mô tả |
|---|---|---|---|---|
| `q` | `string?` | — | `@IsOptional()` + `@MaxLength(100)` + `@Matches(/^[\p{L}\p{N}\s\-._]*$/u)` | Chuỗi tìm kiếm (code + name), case-insensitive. Regex reject ký tự đặc biệt SQL metachar. |
| `limit` | `number?` | `20` | `@IsInt()` + `@Min(1)` + `@Max(50)` + `@Type(() => Number)` | Số item/trang (max 50 để tránh over-fetch). |
| `offset` | `number?` | `0` | `@IsInt()` + `@Min(0)` + `@Type(() => Number)` | Offset phân trang. |
| `status_whitelist` | `ProjectStatus[]?` | `PROJECT_ACTIVE_STATUSES` (xem §3.1.4) | `@IsOptional()` + `@IsArray()` + `@IsEnum(ProjectStatus, { each: true })` + `@Transform` parse CSV | Override whitelist trạng thái (admin tool). |

#### 3.1.2 Response — `200 OK`

Response bọc qua `TransformInterceptor` → shape thực tế:

```typescript
{
  status: true,              // boolean, do TransformInterceptor set
  message: 'Thành công',     // fallback hoặc service trả
  data: {
    items: LookupProjectItemDto[],
    total: number,
    limit: number,
    offset: number,
  }
}
```

**⚠️ Lệch với BA_SPEC §5:** BA_SPEC mô tả `status: 'success'` (string). Thực tế `TransformInterceptor` (`common/interceptors/transform.interceptor.ts:42`) set `status: true` (boolean). SA chọn tuân theo interceptor hiện có → ghi ở §12 Concerns.

#### 3.1.3 `LookupProjectItemDto`

```typescript
export class LookupProjectItemDto {
  @ApiProperty({ example: 'f3e9c2a1-...' })
  id: string;

  @ApiProperty({ example: 'JDHP001' })
  project_code: string;

  @ApiProperty({ example: 'Dự án JDHP Hà Nội' })
  project_name: string;

  @ApiProperty({ enum: ProjectStatus, example: ProjectStatus.ACTIVE })
  status: ProjectStatus;

  @ApiProperty({ enum: ProjectStage, example: ProjectStage.CONSTRUCTION })
  stage: ProjectStage;

  @ApiProperty({ example: 'b2c3d4e5-...', nullable: true })
  organization_id: string | null;

  @ApiProperty({ example: 'Phòng Kỹ thuật', nullable: true })
  organization_name: string | null;
}
```

#### 3.1.4 Constants `PROJECT_ACTIVE_STATUSES`

**File:** `wms-backend/src/projects/enums/project.enum.ts` (bổ sung export, không đổi enum cũ)

```typescript
export const PROJECT_ACTIVE_STATUSES: readonly ProjectStatus[] = [
  ProjectStatus.WON_BID,
  ProjectStatus.ACTIVE,
  ProjectStatus.ON_HOLD,
  ProjectStatus.SETTLING,
  ProjectStatus.WARRANTY,
] as const;
```

Khớp BR-MPL-01 (BA_SPEC §2) — 5 trạng thái "đang sống".

#### 3.1.5 Error responses

| Status | Khi nào | Message (qua `GlobalExceptionFilter`) |
|---|---|---|
| `400 Bad Request` | Query param sai type / `q` quá dài / ký tự cấm | `Tham số tìm kiếm không hợp lệ.` |
| `401 Unauthorized` | JWT thiếu/hết hạn | (do `JwtAuthGuard`) |
| `403 Forbidden` | Không có `VIEW_PROJECTS` lẫn `VIEW_ALL_PROJECTS` | `Bạn không có quyền thực hiện thao tác này. Yêu cầu: [VIEW_PROJECTS | VIEW_ALL_PROJECTS]` |
| `200` + `items: []` | User không thấy project nào (filter org trả rỗng) | `Không tìm thấy dự án khớp.` — KHÔNG throw 403 (anti-leak) |

---

## 4. Folder Structure & File List

### 4.1 Backend (`wms-backend/src/`)

| Hành động | File | Mô tả |
|---|---|---|
| **NEW** | `projects/dto/lookup-projects.dto.ts` | `LookupProjectsDto` (request query) + `LookupProjectItemDto` + `LookupProjectsResponseDto`. |
| **EDIT** | `projects/enums/project.enum.ts` | Thêm export `PROJECT_ACTIVE_STATUSES`. Không đổi enum values. |
| **NEW** | `projects/project-lookup.service.ts` | `ProjectLookupService.search(dto, user)` — tách riêng để giữ `projects.service.ts` khỏi phình (ABUSE avoid Fat Services, sa-rules §4). |
| **EDIT** | `projects/projects.controller.ts` | Thêm `@Get('lookup')` endpoint **phía trên** `@Get(':id')` (line ~175). Inject `ProjectLookupService`. |
| **EDIT** | `projects/projects.module.ts` | Register `ProjectLookupService` trong `providers[]` + `exports[]`. |
| **NEW** | `projects/project-lookup.service.spec.ts` | 6 test cases (xem §10.1). |
| **NEW** | `migrations/1776300000013-AddViewAllProjectsPrivilege.ts` | Seed privilege (§2.3). |
| **EDIT** | `auth/enums/privilege.enum.ts` | Thêm `VIEW_ALL_PROJECTS` vào nhóm PROJECT. |
| **EDIT** | `seed/seed.service.ts` — `privilegesData[]` | Thêm entry `{ code: 'VIEW_ALL_PROJECTS', name: '...', module: 'PROJECT' }` để new env cũng có (idempotent với migration). |
| **NEW** | `common/constants/error-messages.ts` | Constants cho message mapping (BR-MPL-05, §8). |

**File size check:** `projects.controller.ts` hiện ~710 dòng (quá 200 của frontend rule, nhưng backend rule không siết 200 — chấp nhận, chỉ thêm 1 method ngắn). `project-lookup.service.ts` mới dự kiến < 150 dòng.

### 4.2 Frontend (`wms-frontend/src/`)

| Hành động | File | Mô tả | Dự kiến size |
|---|---|---|---|
| **NEW (install)** | `package.json` | Thêm `cmdk: ^1.0.0` (peer của shadcn Command). | — |
| **NEW** | `components/ui/command.tsx` | Shadcn Command component (paste chuẩn từ shadcn CLI). | ~120 dòng |
| **NEW** | `shared/ui/entity-picker/EntityPicker.tsx` | Generic picker (xem §4.3). | ~180 dòng |
| **NEW** | `shared/ui/entity-picker/types.ts` | `EntityPickerProps<T>`, `EntityFetcher<T>`, `EntityOption<T>`. | ~40 dòng |
| **NEW** | `shared/ui/entity-picker/useDebouncedValue.ts` | Hook debounce 300ms. | ~20 dòng |
| **NEW** | `shared/ui/entity-picker/index.ts` | Barrel. | ~5 dòng |
| **EDIT** | `shared/ui/index.ts` | Re-export `EntityPicker`. | +2 dòng |
| **NEW** | `entities/project/api/useProjectLookup.ts` | `useProjectLookup(query, opts)` — React Query hook. `GET /projects/lookup`. | ~60 dòng |
| **NEW** | `entities/project/api/fetchProjectById.ts` | Helper resolve label khi edit mode (US-MPL-04). | ~30 dòng |
| **NEW** | `entities/project/ui/project-picker/ProjectPicker.tsx` | Wrap `EntityPicker`, pre-bind fetcher + renderOption. | ~90 dòng |
| **NEW** | `entities/project/ui/project-picker/index.ts` | Barrel. | ~3 dòng |
| **EDIT** | `entities/project/index.ts` | Thêm `export { ProjectPicker } from './ui/project-picker'` + type `ProjectLookupItem`. | +4 dòng |
| **NEW** | `entities/project/types.ts` — `ProjectLookupItem` | Mirror `LookupProjectItemDto` backend. | +15 dòng |
| **EDIT** | `features/master-plan/ui/MasterPlanFormDialog.tsx` | Replace text input `project_id` (dòng 130-137) bằng `<ProjectPicker>`. Thêm cross-org banner (§7). | ±30 dòng |
| **NEW** | `features/master-plan/constants/project-lookup.strings.ts` | String Việt ngữ (empty/loading/error/cross-org banner) — BR-MPL-05. | ~25 dòng |

**Check 200-dòng:** mọi file mới đều dưới ngưỡng. `MasterPlanFormDialog.tsx` hiện ~180 dòng → sau sửa ~190, vẫn dưới 200.

### 4.3 Props `EntityPicker` (generic)

```typescript
export interface EntityPickerProps<T> {
  value: string | null;                    // UUID đã chọn
  onChange: (id: string | null, item: T | null) => void;
  fetcher: (q: string, signal?: AbortSignal) => Promise<T[]>;
  renderOption: (item: T) => React.ReactNode;
  getId: (item: T) => string;
  getSearchKey: (item: T) => string;       // dùng để hiển thị khi đã chọn
  resolveLabel?: (id: string) => Promise<T | null>; // edit mode (US-MPL-04)
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  emptyText?: string;                      // default "Không tìm thấy."
  loadingText?: string;                    // default "Đang tìm..."
  minSearchChars?: number;                 // default 2
  debounceMs?: number;                     // default 300
  'aria-label'?: string;
}
```

Keyboard: ↑↓ navigate, Enter select, Escape close, Tab commit. Clear button khi `value != null` + không `required`.

---

## 5. Cross-Stack Sync Plan (theo §11 backend rule)

### 5.1 Mapping Entity/DTO ↔ TypeScript interface

| Backend | Frontend | Path |
|---|---|---|
| `LookupProjectItemDto` | `ProjectLookupItem` | `entities/project/types.ts` |
| `LookupProjectsResponseDto.data` | `{ items; total; limit; offset }` | cùng file |
| `ProjectStatus` enum | `ProjectStatus` type union | `entities/project/types.ts` (đã có) |
| `ProjectStage` enum | `ProjectStage` type union | `entities/project/types.ts` (đã có) |
| `VIEW_ALL_PROJECTS` privilege | string literal `'VIEW_ALL_PROJECTS'` | `useAuthStore.hasPrivilege(...)` — dùng trực tiếp, không cần mirror constant (hệ thống hiện dùng string literal). |

### 5.2 Files Frontend phải update khi Backend đổi

| Backend thay đổi | Frontend phải update |
|---|---|
| Đổi shape `LookupProjectItemDto` | `entities/project/types.ts`, `project-picker/ProjectPicker.tsx` renderOption |
| Đổi route `/projects/lookup` | `entities/project/api/useProjectLookup.ts` |
| Đổi default `limit` max | `useProjectLookup.ts` nếu có hardcode |
| Đổi privilege code | `MasterPlanFormDialog.tsx` cross-org check, `useAuthStore.hasPrivilege` call sites |
| Đổi `PROJECT_ACTIVE_STATUSES` | Không cần mirror frontend (backend là source of truth, FE chỉ hiển thị result) |

### 5.3 Verify commands (sau Dev commit ở Gate 4)

```bash
cd wms-backend && npm run build && npm run test -- project-lookup
cd wms-frontend && npm run type-check && npm run lint
```

---

## 6. Clean Architecture Placement

| Layer | Artifact | Ghi chú |
|---|---|---|
| **Domain** | `Project` entity (`projects/entities/project.entity.ts`) | Không đổi. |
| **Application** | `ProjectLookupService.search(dto, user)` (`projects/project-lookup.service.ts`) | Orchestrate: (a) build where condition từ `status_whitelist` + `q` + org filter, (b) check privilege `VIEW_ALL_PROJECTS` từ `user.privileges`, (c) gọi Infrastructure query. KHÔNG chứa SQL raw. |
| **Infrastructure** | TypeORM `QueryBuilder` trong service (không thêm repository lớp riêng — pattern hiện dùng `Repository<Project>` trực tiếp, giữ nhất quán với module hiện tại). | `.createQueryBuilder('p').leftJoin('p.organization', 'o').where(...).andWhere(...).orderBy(...).skip(offset).take(limit).getManyAndCount()`. |
| **Interface** | `ProjectsController.lookup(query, req)` (`projects/projects.controller.ts`) | Chỉ wiring DTO + inject `user` từ `req.user`. Không có business logic. |

### 6.1 Pseudo-code `ProjectLookupService.search()`

```typescript
async search(dto: LookupProjectsDto, user: AuthenticatedUser) {
  const statuses = dto.status_whitelist ?? PROJECT_ACTIVE_STATUSES;
  const bypassOrgFilter = user.privileges.includes('VIEW_ALL_PROJECTS');

  const qb = this.projectRepo
    .createQueryBuilder('p')
    .leftJoin('p.organization', 'o')
    .select([
      'p.id', 'p.project_code', 'p.project_name', 'p.status', 'p.stage',
      'p.organization_id', 'o.organization_name',
    ])
    .where('p.status IN (:...statuses)', { statuses })
    .andWhere('p.deleted_at IS NULL');

  if (!bypassOrgFilter) {
    // V1 — exact match. V2 sẽ thay bằng IN (<subtree ids>) — xem §12.
    qb.andWhere('p.organization_id = :orgId', { orgId: user.contexts?.organization_id });
  }

  if (dto.q && dto.q.length >= 2) {
    qb.andWhere(
      '(LOWER(p.project_code) LIKE :q OR LOWER(p.project_name) LIKE :q)',
      { q: `%${dto.q.toLowerCase()}%` },
    );
  }

  qb.orderBy(
    // Code match ưu tiên hơn name match (US-MPL-01 AC)
    `CASE WHEN LOWER(p.project_code) LIKE :qExact THEN 0 ELSE 1 END`,
    'ASC',
  )
    .addOrderBy('p.project_code', 'ASC')
    .setParameter('qExact', dto.q ? `${dto.q.toLowerCase()}%` : '')
    .skip(dto.offset ?? 0)
    .take(Math.min(dto.limit ?? 20, 50));

  const [rows, total] = await qb.getManyAndCount();

  return {
    message: 'OK',
    data: {
      items: rows.map(toLookupItem),
      total,
      limit: Math.min(dto.limit ?? 20, 50),
      offset: dto.offset ?? 0,
    },
  };
}
```

---

## 7. Security & RBAC

### 7.1 Privilege logic

| User có privilege | Hành vi `/projects/lookup` |
|---|---|
| `VIEW_ALL_PROJECTS` (có thể kèm `VIEW_PROJECTS`) | Bypass filter org → thấy toàn bộ. |
| Chỉ `VIEW_PROJECTS` | Filter `organization_id = user.contexts.organization_id`. |
| Không có cả 2 | `403 Forbidden` từ `PrivilegeGuard`. |

### 7.2 Anti-leak — không throw 403 theo dữ liệu

Khi filter trả 0 row vì RBAC → response `200 { items: [], total: 0 }`. Không tiết lộ "có tồn tại project khớp nhưng anh không được xem".

### 7.3 Cross-org Master Plan — audit log

**Backend:** trong `MasterPlanService.create()`, sau khi resolve `project`:
```typescript
const actorOrgId = ctx.user.contexts?.organization_id;
const crossOrg = project.organization_id && project.organization_id !== actorOrgId;
if (crossOrg) {
  await this.auditLogService.log({
    action: AuditAction.CREATE,        // hoặc enum CROSS_ORG nếu cần mở rộng
    entityName: 'MasterPlan',
    entityId: saved.id,
    reason: 'CREATE_MASTER_PLAN_CROSS_ORG',
    newData: {
      project_id: saved.project_id,
      project_org_id: project.organization_id,
      actor_org_id: actorOrgId,
    },
  });
}
```
Dùng `AuditLogService` sẵn có (`common/audit/audit-log.service.ts`). `AuditInterceptor` trên `MasterPlanController` đảm bảo `actor_id`/`actor_name`/`ip` được set qua `getAuditContext()`.

**Frontend:** khi chọn project có `organization_id !== user.contexts.organization_id`, hiện `<Alert variant="warning">` inline (không modal). String từ `project-lookup.strings.ts`:
> *"Dự án này thuộc tổ chức **{project.organization_name}** — khác tổ chức hiện tại của bạn."*

### 7.4 SQL injection — sanitize `q`

- `LookupProjectsDto.q` validate bằng `@Matches(/^[\p{L}\p{N}\s\-._]*$/u)` — chỉ cho chữ/số/space/`-`/`.`/`_`.
- `QueryBuilder` dùng parameterized `:q` → TypeORM escape tự động.
- Pattern `%${q.toLowerCase()}%`: đảm bảo `q` KHÔNG chứa `%` / `_` (regex đã loại).

### 7.5 Rate limit

Global ThrottlerModule (100 req/60s) đã đủ cho typeahead debounce 300ms. Không cần rule riêng.

---

## 8. Validation & Error Message Mapping

### 8.1 File `wms-backend/src/common/constants/error-messages.ts` (NEW)

Nội dung dự kiến:

```typescript
/**
 * Mapping lỗi kỹ thuật → message nghiệp vụ Việt ngữ (BR-MPL-05).
 * Mọi ngoại lệ hiển thị cho end-user PHẢI đi qua bảng này,
 * không được leak stack / field name raw.
 */
export const ERROR_MESSAGES = {
  PROJECT_LOOKUP: {
    INVALID_QUERY: 'Tham số tìm kiếm không hợp lệ.',
    NO_PERMISSION: 'Bạn không có quyền xem danh sách dự án.',
    EMPTY: 'Không tìm thấy dự án khớp.',
    SERVER_ERROR: 'Không tải được danh sách dự án. Vui lòng thử lại.',
  },
  MASTER_PLAN_CREATE: {
    PROJECT_UUID_INVALID: 'Vui lòng chọn dự án hợp lệ từ danh sách.',
    PROJECT_NOT_FOUND: 'Dự án không còn tồn tại. Vui lòng chọn lại.',
    CONFLICT_YEAR: (year: number) =>
      `Dự án này đã có Master Plan năm ${year}. Vui lòng chọn năm khác hoặc dự án khác.`,
    BUDGET_WARNING: (remaining: string) =>
      `Ngân sách vượt ${remaining} VND còn lại của dự án — cần duyệt bổ sung.`,
  },
} as const;
```

### 8.2 Bảng mapping đầy đủ

| Nguồn lỗi backend | Gốc exception | Hiển thị end-user | Ai map |
|---|---|---|---|
| `project_id must be a UUID` | `BadRequestException` từ ValidationPipe (nếu user vẫn gửi string non-UUID qua API cũ) | `Vui lòng chọn dự án hợp lệ từ danh sách.` | FE `getErrorMessage()` khi match regex `must be a UUID` |
| `404 Project not found` | `NotFoundException` từ `ProjectsService.findOne` | `Dự án không còn tồn tại. Vui lòng chọn lại.` | FE match `status === 404` → `ERROR_MESSAGES.MASTER_PLAN_CREATE.PROJECT_NOT_FOUND` |
| `409 Conflict — (project_id, year)` | `ConflictException` từ `MasterPlanService.create` | Hàm `CONFLICT_YEAR(year)` | FE đọc `response.data.data.conflict_year` + gọi helper |
| `400 Tham số tìm kiếm không hợp lệ` | ValidationPipe reject regex | `ERROR_MESSAGES.PROJECT_LOOKUP.INVALID_QUERY` | BE trực tiếp (dto message) |
| `403 Forbidden` trong lookup | `PrivilegeGuard` | **Không hiển thị** (endpoint trả rỗng thay vì 403 — xem §7.2). Nếu vẫn xảy ra → hiện toast `Bạn không có quyền...`. | FE axios interceptor 403 branch |
| Network / 500 | — | `Không tải được danh sách dự án. Vui lòng thử lại.` + nút Retry | FE React Query `isError` state |
| Budget vượt headroom khi create | `BadRequestException` response có `warning: true` (non-blocking) | `BUDGET_WARNING(remaining)` banner vàng | FE check `response.data.warning === true` |

### 8.3 Helper `calculateBudgetHeadroom` (backend — Q3)

**Vị trí:** `wms-backend/src/master-plan/master-plan.service.ts` — thêm private method.

```typescript
private async calculateBudgetHeadroom(projectId: string): Promise<bigint> {
  // Tạm lấy từ project.budget (chưa có total_budget field rõ ràng — xem §12).
  const project = await this.projectRepo.findOneBy({ id: projectId });
  if (!project) return 0n;
  const { sum } = await this.planRepo
    .createQueryBuilder('mp')
    .select('COALESCE(SUM(mp.budget_vnd::bigint), 0)', 'sum')
    .where('mp.project_id = :pid', { pid: projectId })
    .andWhere('mp.status != :closed', { closed: MasterPlanStatus.CLOSED })
    .getRawOne<{ sum: string }>();
  return BigInt(project.budget ?? 0) - BigInt(sum ?? '0');
}
```

**Áp dụng:** trong `MasterPlanService.create()`, sau khi tạo plan, nếu `BigInt(dto.budget_vnd) > headroom` → response trả `{ warning: true, headroom: headroom.toString() }` — không throw.

---

## 9. Performance Considerations

### 9.1 Target

- **P95 < 300ms** với dataset 10k projects (BA_SPEC NFR 6.1).
- Worst case (no `q`, no org filter admin, first page): `SELECT 20 rows ORDER BY project_code FROM projects WHERE status IN (5 values) LIMIT 20 OFFSET 0` — khoảng 5-20ms trên Postgres 13 với btree trên `status` + `project_code`.

### 9.2 Index plan

| # | Index | Phân kỳ | Lý do |
|---|---|---|---|
| 1 | `CREATE INDEX CONCURRENTLY idx_projects_code_lower ON projects (LOWER(project_code));` | **V1 (ship ngay)** — ship trong cùng migration `1776300000013` (hoặc migration riêng). | `q` search dùng `LOWER(project_code) LIKE '%...%'` — btree functional index hỗ trợ prefix match `LIKE 'abc%'`. Contains match `%abc%` thì ít hưởng lợi nhưng dataset 10k không bottleneck. |
| 2 | `CREATE INDEX idx_projects_status ON projects (status) WHERE deleted_at IS NULL;` | **V1** — partial index chỉ index row sống. | Filter `status IN (...)` là entry-point. |
| 3 | `CREATE INDEX idx_projects_org_status ON projects (organization_id, status) WHERE deleted_at IS NULL;` | **V1** — composite. | Non-admin user filter theo `organization_id` + `status` cùng lúc. |
| 4 | `CREATE EXTENSION IF NOT EXISTS pg_trgm; CREATE INDEX idx_projects_name_trgm ON projects USING gin (LOWER(project_name) gin_trgm_ops);` | **V2 — ship sau khi đo metric ở staging**. | Chỉ cần nếu `project_name ILIKE '%...%'` vượt 100ms ở 10k rows. `pg_trgm` đã được enable ở migration `1776300000033-DocumentControlV21Sprint4` → không cần enable lại. |

**Decision:** index #1, #2, #3 ship V1 cùng privilege migration (gộp thành 1 migration hoặc 2 file migration liên tiếp — Dev quyết). Index #4 backlog, ticket `PERF-PROJECT-LOOKUP-TRGM`.

### 9.3 Query cost — EXPLAIN hint

```sql
EXPLAIN ANALYZE
SELECT p.id, p.project_code, p.project_name, p.status, p.stage, p.organization_id, o.organization_name
FROM projects p
LEFT JOIN organizations o ON o.id = p.organization_id
WHERE p.status IN ('WON_BID','ACTIVE','ON_HOLD','SETTLING','WARRANTY')
  AND p.deleted_at IS NULL
  AND p.organization_id = $1
  AND (LOWER(p.project_code) LIKE '%jdhp%' OR LOWER(p.project_name) LIKE '%jdhp%')
ORDER BY (CASE WHEN LOWER(p.project_code) LIKE 'jdhp%' THEN 0 ELSE 1 END), p.project_code
LIMIT 20;
```

Expect: Bitmap Heap Scan on `idx_projects_org_status` + sort in-memory. Nếu EXPLAIN thấy Seq Scan → bổ sung index #4.

### 9.4 Caching

- Không cache backend (data đổi thường xuyên, tránh stale).
- Frontend React Query `staleTime: 30s`, `gcTime: 5min` cho cùng `q`.

### 9.5 N+1 avoidance

Chỉ 1 query với `LEFT JOIN organizations`. Không `relations: [...]` (tránh eager load 3 FK khác của Project).

---

## 10. Testing Strategy

### 10.1 Backend unit test `ProjectLookupService.search()`

**File:** `wms-backend/src/projects/project-lookup.service.spec.ts`

| # | Test case | Setup | Assert |
|---|---|---|---|
| 1 | Search match code | Seed 3 project `JDHP001/JDHP002/OTHER001`, user `VIEW_PROJECTS` cùng org | `q='jdhp'` → 2 items, `JDHP001` đứng đầu (prefix match) |
| 2 | Empty result | User org khác, không `VIEW_ALL_PROJECTS` | `data.items=[]`, `data.total=0`, KHÔNG throw |
| 3 | Pagination | Seed 30 project cùng org | `limit=20, offset=0` → 20 items, `total=30`; `limit=20, offset=20` → 10 items |
| 4 | Privilege bypass | User `VIEW_ALL_PROJECTS` ở org A, seed 2 project org A + 3 project org B | Trả đủ 5 items (no org filter) |
| 5 | Status filter | Seed 5 project: 2 ACTIVE, 1 DRAFT, 1 SETTLED, 1 CANCELED | Default whitelist → chỉ 2 ACTIVE |
| 6 | SQL injection safety | `q="'; DROP TABLE projects;--"` | ValidationPipe reject `400` (regex), không tới service |

### 10.2 Frontend unit tests

**Vị trí:** colocation trong folder component.

- `shared/ui/entity-picker/EntityPicker.test.tsx`:
  1. Render placeholder khi `value=null`.
  2. Debounce 300ms — chỉ gọi `fetcher` 1 lần khi gõ liên tục 5 ký tự.
  3. Keyboard ↓↓ + Enter → `onChange` gọi với id đúng.
  4. Escape → đóng dropdown, giữ value cũ.
  5. `disabled=true` → không mở dropdown.

- `entities/project/ui/project-picker/ProjectPicker.test.tsx`:
  1. Mock `useProjectLookup` → hiển thị `{code} — {name} · {stage_label}`.
  2. Edit mode preload: `value='uuid-1'` + mock `fetchProjectById` → label hiển thị đúng lần render đầu.
  3. `fetchProjectById` 404 → warning đỏ + label "Dự án không còn tồn tại".

### 10.3 Integration test `MasterPlanFormDialog`

- Mock API `/projects/lookup` trả 3 items cross-org (1 org khác user hiện tại).
- User gõ `JDH` → chọn item cross-org → banner warning xuất hiện.
- Submit → payload có đúng `project_id` (UUID), không có lỗi `must be a UUID`.

### 10.4 Manual verification checklist (test-rules.md Bước 4)

- [ ] Mở form Master Plan → gõ mã → dropdown hiện ≤ 200ms sau debounce
- [ ] Chọn project cross-org (user có `VIEW_ALL_PROJECTS`) → banner vàng xuất hiện
- [ ] Submit → plan tạo thành công, audit log có entry `CREATE_MASTER_PLAN_CROSS_ORG`
- [ ] User KHÔNG có privilege → dropdown chỉ thấy project cùng org
- [ ] Edit plan cũ (project đã archive) → form hiện label đỏ "Dự án không còn tồn tại"

---

## 11. Rollout & Migration Plan

### 11.1 Feature flag
**Không cần.** Endpoint mới, form sửa in-place. Backward-compatible (nếu FE deploy chậm → vẫn gửi UUID qua form cũ; nếu BE deploy chậm → FE dropdown fail → toast "Không tải được" + user phải đợi).

### 11.2 Data migration
Chỉ seed 1 privilege (idempotent `ON CONFLICT DO NOTHING`). Không backfill data row nào. Index tạo bằng `CONCURRENTLY` → không lock bảng `projects` trong deploy.

### 11.3 Deprecation
`GET /projects` giữ nguyên (dùng cho danh sách đầy đủ ở trang `/projects`). Không deprecate.

### 11.4 Thứ tự deploy

1. **Migration chạy trước** (`npm run migration:run`) — tạo privilege + 3 index. `SeedService.onApplicationBootstrap` sẽ auto-gán privilege cho SUPER_ADMIN ở lần khởi động kế tiếp.
2. **Backend deploy** — expose endpoint `/projects/lookup`.
3. **Frontend deploy** — UI mới sử dụng endpoint.
4. **Smoke test** (test-rules.md Bước 4) — 5 bullet §10.4 ở staging.
5. **Rollback plan:** revert FE trước (UI quay lại text input UUID → vẫn work với BE cũ), sau đó `npm run migration:revert` nếu cần xóa privilege.

### 11.5 Documentation update

- Swagger UI auto-gen từ decorator — không cần cập nhật tay.
- `wms-backend/CLAUDE.md §7.4 Privilege Matrix` — thêm 1 row `PROJECT | VIEW_PROJECTS, MANAGE_PROJECTS, VIEW_ALL_PROJECTS` (nếu chưa có) ở Gate 6.

---

## 12. Open Technical Concerns

> **Lưu ý:** Các concern dưới đây KHÔNG tự sửa ở Gate 2. Flag cho Tech Advisor quyết trước/sau Gate 3.

### C1 — BA_SPEC response shape `status: 'success'` vs TransformInterceptor `status: true`

BA_SPEC §5 mô tả response `{ status: 'success', message, data }`. Thực tế `TransformInterceptor` (`common/interceptors/transform.interceptor.ts:42`) hardcode `status: true` (boolean). SA chọn tuân theo interceptor hiện có → **FE phải mirror `status: boolean`**.

**Đề xuất:** cập nhật BA_SPEC §5 ở Gate 1 revision, hoặc đổi `TransformInterceptor` sang string `'success' | 'error'`. Việc sau tác động toàn hệ thống — không đụng trong PR này.

### C2 — `project.budget` vs `project.total_budget` cho helper `calculateBudgetHeadroom`

BA_SPEC BR-MPL-04 nói dùng `project.total_budget`. Thực tế entity `Project` có `budget` (decimal 15,2) và `contract_value` (decimal 18,2). Không có field nào tên `total_budget`.

**SA tạm dùng `project.budget`** (xem §8.3 pseudo-code). Nếu nghiệp vụ cần `contract_value` (tổng giá trị hợp đồng CĐT) hay sum của các `project_budgets.planned_amount` → cần Tech Advisor chốt trong Gate 3.

### C3 — `user.contexts.organization_id` — nguồn field chưa rõ

JWT payload (`jwt.strategy.ts:28`) có `contexts` nhưng không schema rõ ràng. BA_SPEC giả định `user.organization_id`. SA dùng `user.contexts?.organization_id` nhưng chưa verify field này có luôn được set khi login hay không.

**Action Gate 3/4:** Dev kiểm tra `AuthService.login()` xem aggregate `contexts` payload thế nào. Nếu không có → fallback query `employee.department_id` từ `user.employeeId`.

### C4 — `cmdk` chưa có trong frontend dependencies

`wms-frontend/package.json` không có `cmdk`, và `components/ui/command.tsx` chưa tồn tại. Dev Gate 4 phải `npm install cmdk` + paste chuẩn shadcn Command component. Không phải concern nghiệp vụ nhưng cần flag cho DevOps Gate 6 verify `package-lock.json` cập nhật đúng.

### C5 — V2 Org subtree visibility — hook mở rộng

V1 filter `organization_id = user.contexts.organization_id`. `Organization` entity đã có `parent_id` (self-ref). V2 implementation dự kiến:

```sql
WITH RECURSIVE org_tree AS (
  SELECT id FROM organizations WHERE id = :rootId
  UNION ALL
  SELECT o.id FROM organizations o JOIN org_tree ot ON o.parent_id = ot.id
)
SELECT ... WHERE p.organization_id IN (SELECT id FROM org_tree)
```

**Hook mở rộng:** chỉ cần đổi 1 chỗ trong `ProjectLookupService.search()` — đoạn `andWhere('p.organization_id = :orgId')`. Ticket backlog: `ORG-HIERARCHY-VISIBILITY`.

### C6 — Quota bảo vệ endpoint `/projects/lookup`

Hệ thống global ThrottlerModule 100 req/60s — đủ cho 1 user typeahead. Nhưng nếu attacker viết bot gõ 100 keystroke/60s × N user bị leak → có thể stress DB.

**Đề xuất (không bắt buộc V1):** thêm `@Throttle({ short: { ttl: 10000, limit: 30 } })` override cho endpoint này = 30 req/10s/user. Ghi chú backlog.

### C7 — `search_vector` + `unaccent` đã enable

Migration `1776300000033-DocumentControlV21Sprint4` đã enable `pg_trgm` + `unaccent`. SA **chưa dùng `unaccent`** cho V1 (vì project_code là ASCII, project_name user-input tiếng Việt có dấu nhưng BA_SPEC chỉ yêu cầu case-insensitive, không bắt buộc accent-insensitive).

**Nếu user complain "gõ không dấu không ra dự án có dấu"** → V2 đổi `LOWER(p.project_name) LIKE` thành `unaccent(LOWER(p.project_name)) LIKE unaccent(LOWER(:q))`.

---

## Checklist hoàn thành (theo `.claude/rules/sa-rules.md`)

- [x] Entity và quan hệ Database (ERD) đã xác định (§2) — không đổi schema, chỉ seed privilege + index
- [x] API Endpoints đã liệt kê đầy đủ contract (§3) — `GET /projects/lookup` full spec
- [x] Interface và DTOs đã định nghĩa (§3, §4) — `LookupProjectsDto`, `LookupProjectItemDto`, `EntityPickerProps<T>`
- [x] Clean Architecture folder structure đã rõ ràng (§4, §6) — Domain/Application/Infrastructure/Interface mapping
- [x] Tối ưu cho truy vấn (§9) — 3 index V1 + 1 index V2 + query plan
- [x] Cross-Stack Sync plan hoàn chỉnh (§5)
- [x] Error message mapping đầy đủ BR-MPL-05 (§8) — bảng 7 hàng + helper strings
- [x] Performance target P95 < 300ms có số liệu cụ thể (§9.2)
- [x] Testing Strategy 6 unit + 5 integration + 5 manual checks (§10)
- [x] Rollout plan có thứ tự deploy + rollback (§11)
- [x] Open Technical Concerns 7 items flagged (§12) — không tự quyết

---

**Người thiết kế:** SA Agent
**Review trước Gate 3:** Tech Advisor (Duy) duyệt SA_DESIGN + quyết các Concerns §12
**Next Gate:** Gate 3 (UI/UX Designer — `UI_SPEC.md`) — chờ approval
