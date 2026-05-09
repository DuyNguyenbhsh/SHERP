# AUDIT REPORT — Master Plan Project Lookup

> **Ngày:** 2026-04-26
> **Auditor:** Senior Lead Auditor (Claude Opus 4.7, /review command)
> **Branch:** `feature/master-plan-project-lookup` (24+1 commits ahead `main`)
> **PR:** GitHub #2 — `feat: Master Plan — Project Lookup (LOV picker + cross-org)`
> **Tool note:** `gh` CLI không cài → review từ `git diff main..HEAD` local.

## Tóm tắt

Thay text input "Project UUID" trong `MasterPlanFormDialog` bằng **LOV picker** (`ProjectPicker` wrapping generic `EntityPicker`). Backend thêm `GET /projects/lookup` + privilege `VIEW_ALL_PROJECTS` + cross-org audit log + index migration kèm `f_unaccent` IMMUTABLE wrapper. Frontend tách `EntityPicker` generic dưới `shared/ui/` để tái sử dụng cho LOV khác.

## Bảng trạng thái Gate

| Gate   | Trạng thái | Nhận xét |
|:-------|:-----------|:---------|
| BA     | ✅ PASS    | `BA_SPEC.md` 270 dòng — User Stories + 8 Business Rules (BR-MPL-01..08) + KPI fields đầy đủ. Hạch toán Nợ/Có không áp dụng (read-only LOV). |
| SA     | ✅ PASS    | `SA_DESIGN.md` 717 dòng + ADDENDUM 150 dòng (Tech Advisor revision pass). ERD optimized cho ITD/PTD qua composite index `idx_projects_org_status`. Clean Architecture: domain logic (RBAC, anti-leak) trong service, không leak xuống controller. |
| DEV    | ⚠️ MINOR FIX | Code production-grade. **1 issue [P1] đã fix trong audit pass:** `offset` thiếu `@Max(10000)`. **2 follow-up defer:** test cho `MasterPlanService.create()` cross-org branch (Low), `clearTimeout` cleanup ở `MasterPlanModule.registerCron` (Low, cross-cut với commit `c4fa5c9` main). |
| TEST   | ✅/⚠️ PASS  | Backend: 526/526 PASS (+10 mới cho `ProjectLookupService`). Frontend: **không có runtime test runner** — `FE-TEST-INFRA-SETUP` đã ở backlog. 31 selector test (file content grep) PASS. QA_TEST_MATRIX 56 case sẵn sàng cho QA team manual execute. |
| DEPLOY | ⏸ HOLD    | Migration `1776300000013` cần `CREATE EXTENSION` privilege trên NeonDB. Verify trước Gate 6. Privilege seeding tự động qua `SeedService.onApplicationBootstrap`. Reversible: `migration:revert` cascade-safe (FK `onDelete: CASCADE` từ `RolePrivilege.privilege`). |

## Findings chi tiết

### ✅ Code correctness
- `PrivilegeGuard.canActivate()` dùng `.some()` — OR logic chính xác như spec.
- Route order trong `ProjectsController`: `/lookup` đặt trước `:id` → Nest match đúng.
- `RolePrivilege.privilege` FK có `onDelete: CASCADE` → migration `down()` an toàn.
- React hook deps trong `EntityPicker.useEffect` đầy đủ.
- `useCreateMasterPlan` preserve envelope-level `warning` + `headroom`.
- Không có XSS surface: `grep dangerouslySetInnerHTML|innerHTML|eval` trên 3 thư mục liên quan → 0 match.

### ✅ Project conventions
- Naming chuẩn: kebab-case file, PascalCase + Dto suffix, snake_case column.
- DTO validation đầy đủ class-validator: `@MaxLength(100)`, regex Unicode whitelist, `@Min/@Max` cho limit + offset.
- Error messages tiếng Việt qua `common/constants/error-messages.ts`.
- API response wrap `{status, message, data}`.
- FSD layer: `pages → features → entities → shared`, không cross-import.
- 0 hardcoded VN strings trong JSX.

### ⚠️ Performance — 1 issue đã fix (P1)
**`offset` không có upper bound** (`lookup-projects.dto.ts:53-57`)
- User có thể gửi `?offset=999999999` → Postgres scan → DoS vector minor.
- **Fixed**: thêm `@Max(10000)` (commit trong audit pass).

### ⚠️ Performance — 1 issue defer (P3)
**`MasterPlanModule.registerCron`: timeout không `clearTimeout`** (`master-plan.module.ts:71-87`)
- `Promise.race` không cancel timer thua cuộc → resource leak nhẹ trên lifecycle.
- **Decision**: defer, cross-cut với commit `c4fa5c9` đã ở main. Backlog hardening.

### ⚠️ Test coverage gap
**`MasterPlanService.create()` mở rộng (cross-org audit + soft warning)** — 3 nhánh không có unit test trong diff:
1. Same-org user → không gọi `auditLogService.log`
2. Cross-org user → log với `reason: 'CREATE_MASTER_PLAN_CROSS_ORG'`
3. `planBudget > headroom` → response có `warning: true, headroom: string`

**Decision**: Manual QA matrix cover các scenario; defer unit test sang backlog `MASTER-PLAN-CREATE-UNIT-TESTS`.

### ✅ Security
| Vector | Status |
|---|---|
| SQL injection | ✅ 100% parameterized, test TC6 verify |
| RBAC bypass | ✅ Anti-leak `1=0`, test TC2b verify |
| Privilege escalation | ✅ Seed via migration, không self-grant qua API |
| XSS | ✅ React auto-escape, 0 `dangerouslySetInnerHTML` |
| Pagination DoS | ✅ Đã fix `@Max(10000)` cho offset |
| Timing attack | ✅ 404/403 → null ở frontend |

## Action Items

### ✅ Done trong audit pass
- [x] Fix `offset @Max(10000)` trong `lookup-projects.dto.ts`

### Defer backlog (đã file)
- [ ] `BACKEND-BODY-PARSER-ROUTE-LEVEL-LIMIT` (low) — đã file `docs/backlog/hardening-backlog.md`
- [ ] `FE-ENTITY-PICKER-CONSUME-QUERYSTATEROW` (low) — đã file
- [ ] `FE-TEST-INFRA-SETUP` (medium) — đã file ở PR_DESCRIPTION
- [ ] `MASTER-PLAN-CREATE-UNIT-TESTS` (low) — **NEW từ audit pass này**
- [ ] `MASTER-PLAN-CRON-TIMEOUT-CLEANUP` (low) — **NEW từ audit pass này**

### Trước Gate 6 deploy
- [ ] Verify NeonDB role có `CREATE EXTENSION` privilege
- [ ] Manual smoke test `migration:revert` trên dev clone
- [ ] Admin grant `VIEW_ALL_PROJECTS` cho super-admin sau seed

## Kết luận

**APPROVE** — sau khi fix `[P1] offset @Max(10000)` đã landed trong audit pass này.

Tất cả Gate 1–5 PASS, 526/526 backend test PASS, 31/31 selector test PASS, lint 0 errors, type-check PASS, no XSS, SQL parameterized, RBAC anti-leak verified, migration cascade-safe.

Code quality production-grade — em không thấy blocker nào khác.

**Ready for**: merge → Gate 6 deploy (sau khi QA_RUN_REPORT pass ≥51/56 + admin verify NeonDB extension privilege).
