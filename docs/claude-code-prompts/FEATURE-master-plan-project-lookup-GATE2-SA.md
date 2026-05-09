# CLAUDE CODE CLI — LỆNH THỰC THI
## Gate 2: System Architecture Design
## Feature: `master-plan-project-lookup`

---

## ROLE ASSIGNMENT

Bạn đang đóng vai **System & Software Architect (SA)** cho dự án SH-GROUP ERP.

BẮT BUỘC đọc theo thứ tự trước khi làm:
1. `CLAUDE.md` (root)
2. `.claude/rules/sa-rules.md`
3. `docs/features/master-plan-project-lookup/BA_SPEC.md` (đã có ở Gate 1)
4. `wms-backend/CLAUDE.md` — toàn bộ, đặc biệt §4 (Architecture), §5 (Migration), §7 (Security), §11 (Cross-Stack Sync)
5. `wms-frontend/CLAUDE.md` — toàn bộ (FSD architecture, coding standards)

---

## PRE-FLIGHT CHECKS (phải làm trước khi viết SA_DESIGN)

### 1. Kiểm tra Git state
```bash
cd D:\SHERP\SHERP
git log main --oneline -10
git status
git branch
```

Báo cáo cho Tech Advisor:
- 3 commit gần nhất trên `main` là gì?
- Có commit nào ngoài `docs(master-plan): add BA_SPEC ...` không?
- Nếu có commit không được phép → **DỪNG**, báo cáo, chờ quyết định revert.

### 2. Branching policy từ giờ
Từ Gate 2 trở đi, **KHÔNG push thẳng lên `main`**. Mỗi gate tạo 1 branch riêng:

```bash
git checkout -b feature/master-plan-project-lookup-sa
```

Deliverable commit lên branch này. Tech Advisor sẽ merge sau khi approve.

---

## BỐI CẢNH — 7 OPEN QUESTIONS ĐÃ ĐƯỢC TECH ADVISOR QUYẾT ĐỊNH

Các quyết định dưới đây là **ĐẦU VÀO BẮT BUỘC** cho SA_DESIGN. Không được tự ý thay đổi. Nếu thấy quyết định nào bất khả thi về kỹ thuật → ghi vào phần "Technical Concerns" và flag cho Tech Advisor, không tự quyết.

### Q1 — Filter: `status`, KHÔNG mở rộng enum
- Dùng `status` hiện có làm whitelist lookup. Gọi là `PROJECT_ACTIVE_STATUSES` constants.
- KHÔNG thêm `WON_BID/ON_HOLD/SETTLING/WARRANTY` trong PR này. Việc mở rộng enum là scope riêng, cần BA_SPEC khác.
- `stage` hiển thị phụ trong dropdown option (format: `{code} — {name} · {stage_label}`).

### Q2 — Thêm privilege `VIEW_ALL_PROJECTS`
- Migration mới: seed privilege `VIEW_ALL_PROJECTS` vào bảng `privileges`.
- Assign mặc định cho role `SUPER_ADMIN` (và các role cấp tập đoàn nếu có).
- Backend: check privilege này để bypass org filter ở `/projects/lookup`.
- Cross-stack: frontend `useAuth()` phải đọc privilege này để quyết định gọi endpoint có filter hay không.

### Q3 — Budget: warning ở `create`, hard-block ở `approve()`
- `create`: gọi helper `calculateBudgetHeadroom(project_id)` = `project.total_budget - Σ active_plans_budget`. Nếu `master_plan.budget_vnd > headroom` → trả warning trong response (không reject). Frontend hiển thị banner vàng.
- `approve()`: giữ nguyên `BudgetService.checkBudgetLimit()` hard-block (BR-MP-04).
- Log warning event để analytics tracking.

### Q4 — Org visibility: V1 = exact match, V2 = subtree
- V1: filter `WHERE project.organization_id = :user_org_id` (hoặc bypass nếu có `VIEW_ALL_PROJECTS`).
- V2 sau: tạo ticket backlog `ORG-HIERARCHY-VISIBILITY`. KHÔNG implement trong PR này.
- Ghi rõ trong SA_DESIGN: tại sao V1 chấp nhận được và điểm mở rộng V2 ở đâu.

### Q5 — Endpoint mới `GET /projects/lookup`
- Route: `GET /projects/lookup`
- Query params: `q?: string` (search code + name, case-insensitive, unaccent), `limit?: number (default 20, max 50)`, `offset?: number (default 0)`, `status_whitelist?: string[]` (mặc định = `PROJECT_ACTIVE_STATUSES`).
- Response shape:
  ```typescript
  {
    status: 'success',
    message: 'OK',
    data: {
      items: Array<{
        id: string              // UUID
        project_code: string    // JDHP001
        project_name: string
        status: ProjectStatus
        stage: ProjectStage
        organization_id: string
        organization_name: string
      }>,
      total: number,
      limit: number,
      offset: number,
    }
  }
  ```
- Search logic: `ILIKE` trên `project_code` và `project_name`. Nếu dataset > 5k rows → đề xuất GIN trigram index (phase tối ưu sau).
- Privilege: `VIEW_PROJECTS` (đã có) + auto-filter org, hoặc `VIEW_ALL_PROJECTS` bypass filter.

### Q6 — `<EntityPicker>` 2-tier
- **Layer shared (generic):** `wms-frontend/src/shared/ui/entity-picker/EntityPicker.tsx`
  - Props: `value, onChange, fetcher, renderOption, placeholder, disabled, required, error, emptyText, loadingText, minSearchChars`
  - Dùng `shadcn/ui` `<Command>` component làm base (đã có dependency).
  - Debounce 300ms. Keyboard navigation đầy đủ. Clearable.
- **Layer entities (pre-configured):** `wms-frontend/src/entities/project/ui/project-picker/ProjectPicker.tsx`
  - Wrap `EntityPicker`, pre-bind fetcher gọi `/projects/lookup`, pre-set `renderOption` format `{code} — {name} · {stage}`.
  - Barrel export qua `entities/project/index.ts`.
- Form Master Plan chỉ import `ProjectPicker` — không biết gì về EntityPicker generic.

### Q7 — Cross-org: banner inline + audit log
- KHÔNG modal confirm.
- Frontend: khi user chọn project có `organization_id !== currentUser.organization_id` → hiển thị `<Alert variant="warning">` trong form: *"Dự án này thuộc tổ chức [X] — khác tổ chức của bạn ([Y])."*
- Backend: create Master Plan có cờ `cross_org: boolean` suy ra từ so sánh. Ghi audit log qua `AuditService.log(...)` với payload `{action: 'CREATE_MASTER_PLAN_CROSS_ORG', ...}`.
- Chỉ áp dụng được khi user có `VIEW_ALL_PROJECTS` — vì không có quyền thì đã không thấy project đó rồi.

---

## DELIVERABLE

Tạo file `docs/features/master-plan-project-lookup/SA_DESIGN.md` tuân thủ tuyệt đối `.claude/rules/sa-rules.md`.

### Cấu trúc bắt buộc

1. **Executive Summary** (≤ 10 dòng)
2. **Entity & Database Schema changes**
   - Không sửa schema `Project` / `MasterPlan`.
   - Thêm seed migration cho privilege `VIEW_ALL_PROJECTS`.
   - Đặt tên migration: `<NextNumber>-AddViewAllProjectsPrivilege.ts`.
3. **API Endpoints (đầy đủ spec OpenAPI/Swagger)**
   - `GET /projects/lookup` — contract full.
   - Request DTO class name: `LookupProjectsDto` tại `wms-backend/src/project/dto/lookup-projects.dto.ts`.
   - Response DTO: `LookupProjectItemDto` + `LookupProjectsResponseDto`.
4. **Folder Structure & File list**
   - Backend: liệt kê file mới/sửa trong `wms-backend/src/project/`.
   - Frontend: liệt kê file mới trong:
     - `shared/ui/entity-picker/`
     - `entities/project/ui/project-picker/`
     - `entities/project/api/` (hook `useProjectLookup`)
     - `features/master-plan/ui/MasterPlanFormDialog.tsx` (sửa)
   - Mỗi file ≤ 200 dòng (theo frontend rule).
5. **Cross-Stack Sync Plan** (theo §11 backend rule)
   - Mapping Entity/DTO ↔ TypeScript interface.
   - Danh sách file frontend phải update khi backend đổi.
6. **Clean Architecture placement**
   - Domain: `Project` entity không đổi.
   - Application: `ProjectLookupService.search()` method mới trong service hiện có.
   - Infrastructure: query dùng TypeORM `QueryBuilder` với ILIKE.
   - Interface: `ProjectController.lookup()` endpoint.
7. **Security & RBAC**
   - Privilege required: `VIEW_PROJECTS`.
   - `VIEW_ALL_PROJECTS` bypass org filter.
   - Audit log cho cross-org Master Plan creation.
8. **Validation & Error Message Mapping**
   - Bảng mapping: technical error → Vietnamese business message.
   - File: `wms-backend/src/common/constants/error-messages.ts` (tạo mới hoặc mở rộng).
9. **Performance Considerations**
   - Target P95 < 300ms ở 10k projects (từ BA_SPEC).
   - Plan index: `CREATE INDEX CONCURRENTLY idx_projects_code_lower ON projects (LOWER(project_code));` và `idx_projects_name_trgm` (pg_trgm).
   - Phân kỳ: index nào ship V1, index nào để sau khi đo metric.
10. **Testing Strategy**
    - Backend: unit test `ProjectLookupService.search()` (6 test cases tối thiểu: search match, empty, pagination, privilege bypass, status filter, injection safety).
    - Frontend: unit test `EntityPicker` + `ProjectPicker` + integration test `MasterPlanFormDialog`.
11. **Rollout & Migration Plan**
    - Feature flag? (đề xuất: không cần vì backward-compatible).
    - Data migration? (chỉ seed privilege, không migrate data).
    - Deprecation: không có — `GET /projects` vẫn giữ.
12. **Open Technical Concerns** (nếu có)
    - Điểm nào SA thấy quyết định Tech Advisor có risk kỹ thuật → flag ở đây, không tự sửa.

### Checklist hoàn thành (theo sa-rules.md)

- [ ] Entity & ERD changes liệt kê đầy đủ (dù không đổi schema)
- [ ] API Endpoints đầy đủ contract
- [ ] Interface & DTOs định nghĩa (tên class, đường dẫn)
- [ ] Clean Architecture folder structure rõ ràng
- [ ] Có kế hoạch tối ưu truy vấn (index, pagination)
- [ ] Cross-Stack Sync plan hoàn chỉnh
- [ ] Error message mapping đầy đủ (theo BR-MPL-05)

---

## EXECUTION PROTOCOL

1. **BƯỚC 1:** Pre-flight check (git log, git status, verify previous commits).
2. **BƯỚC 2:** Checkout branch mới `feature/master-plan-project-lookup-sa`.
3. **BƯỚC 3:** Đọc đủ 5 file rule + BA_SPEC.
4. **BƯỚC 4:** Đọc source code liên quan:
   - `wms-backend/src/project/**` (toàn bộ module project)
   - `wms-backend/src/auth/**` (privilege guard, JWT strategy)
   - `wms-backend/src/common/**` (interceptors, filters, constants có sẵn)
   - `wms-frontend/src/entities/project/**`
   - `wms-frontend/src/shared/api/axios.ts`
   - `wms-frontend/src/components/ui/command.tsx` (shadcn Command có sẵn chưa? nếu chưa → note add)
5. **BƯỚC 5:** Viết `SA_DESIGN.md`.
6. **BƯỚC 6:** Commit trên branch: `docs(master-plan): add SA_DESIGN for project lookup feature (Gate 2)`.
7. **BƯỚC 7:** DỪNG. Báo cáo:
   - Kết quả pre-flight check (3 commit gần nhất là gì)
   - Đường dẫn SA_DESIGN.md
   - Tóm tắt 5 dòng: thay đổi kỹ thuật chính, có risk nào không
   - Branch name + số commit

### TUYỆT ĐỐI KHÔNG ĐƯỢC

- KHÔNG tạo file code `.ts` trong `src/` của backend hay frontend.
- KHÔNG chạy migration thật (chỉ viết tên + nội dung dự kiến trong SA_DESIGN).
- KHÔNG push lên `main`, chỉ push lên branch feature.
- KHÔNG tự sang Gate 3 (UI_SPEC).
- KHÔNG thay đổi bất kỳ quyết định nào trong 7 Open Questions đã duyệt. Nếu có concern → ghi vào mục 12.

---

## MA TRẬN PHÂN LOẠI THAY ĐỔI — PHẢI GHI NHỚ VÀ ÁP DỤNG MỌI PR SAU NÀY

Từ giờ, Claude Code CLI PHẢI phân loại mọi task trước khi làm, để biết áp dụng bao nhiêu gate. Đọc và ghi nhớ ma trận này (sẽ được bổ sung vào `CLAUDE.md` root ở gate riêng):

| Loại thay đổi | Ví dụ điển hình | Gate bắt buộc | Deliverable tối thiểu |
|---|---|---|---|
| **Hotfix / Bug thật** | Logic sai, crash, NPE, wrong validation, typo logic | Gate 4 + 5 | Fix commit + test case tái hiện bug |
| **UX polish** | Đổi label, sửa error message, đổi màu nhẹ, đổi icon | Gate 3 (short) + 4 | Screenshot trước/sau + PR note |
| **Schema / API nhỏ** | Thêm 1 column nullable, thêm endpoint đồng dạng cái có | Gate 2 + 4 + 5 | SA mini-note (1-2 trang) |
| **Feature / UX redesign** | Component dùng chung, đổi flow, RBAC filter mới, BR mới | **Đủ 6 Gate** | BA + SA + UI + code + test + deploy |
| **Chore / Infra / Docs** | Sửa path sai, update README, bump dependency | Gate 6 hoặc bỏ qua | Commit nhỏ, conventional |
| **Security / Privilege** | Thêm privilege, đổi auth, sửa CORS | Gate 2 + 4 + 5 + 6 | SA note + security review |
| **Data Migration** | Backfill data, đổi cấu trúc bảng | Gate 2 + 4 + 5 + 6 | Migration script + rollback plan |

### Quy tắc áp dụng

1. **Mặc định:** nếu không rõ task thuộc loại nào → hỏi Tech Advisor. Không tự quyết.
2. **Leo thang:** nếu đang làm "UX polish" mà phát hiện cần đổi schema → dừng, phân loại lại thành "Schema/API nhỏ", bổ sung Gate 2.
3. **Không gộp loại:** một PR chỉ chứa một loại thay đổi. Bug fix đi với bug fix, feature đi với feature.
4. **Commit message prefix:**
   - Hotfix: `fix:`
   - UX polish: `style:` hoặc `fix(ui):`
   - Schema/API nhỏ: `feat:` hoặc `refactor:`
   - Feature: `feat:` + reference ticket
   - Chore: `chore:`
   - Security: `fix(security):` hoặc `feat(auth):`
   - Migration: `feat(db):` hoặc `chore(db):`

### Phân loại feature hiện tại

`master-plan-project-lookup` = **Feature / UX redesign** → đủ 6 Gate. Đang ở Gate 2.

---

## COMMIT MESSAGE KHI HOÀN THÀNH GATE 2

```
docs(master-plan): add SA_DESIGN for project lookup feature (Gate 2)

- Define GET /projects/lookup endpoint contract
- Plan VIEW_ALL_PROJECTS privilege migration
- Design 2-tier EntityPicker/ProjectPicker architecture
- Map technical errors to Vietnamese business messages
- V1 org visibility: exact match only (V2 subtree backlogged)

Refs: #<ticket-id>
Gate-2-Approved-By: <pending>
```

---

**Bắt đầu từ BƯỚC 1. Nhớ DỪNG LẠI sau BƯỚC 7.**
