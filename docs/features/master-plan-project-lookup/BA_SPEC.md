# BA_SPEC — Feature: `master-plan-project-lookup`

> **Gate:** 1 (Business Analysis)
> **Ngày phân tích:** 2026-04-22
> **Trạng thái:** DRAFT — chờ Tech Advisor / Product Owner duyệt
> **Tham chiếu:**
> - `.claude/rules/ba-rules.md` — tiêu chuẩn BA
> - `wms-backend/CLAUDE.md §11` — Cross-Stack Sync Protocol
> - `wms-frontend/CLAUDE.md` — Feature-Sliced Design
> - `docs/features/master-plan/BA_SPEC.md` — BA Master Plan gốc (Gate 1 đã APPROVED)

---

## 0. Tóm tắt nghiệp vụ

**Vấn đề:** Form "Tạo Master Plan" (`wms-frontend/src/features/master-plan/ui/MasterPlanFormDialog.tsx:131`) yêu cầu user nhập tay UUID dự án vào text input (`placeholder="a1b2c3d4-..."`). Người dùng nghiệp vụ không biết UUID — họ chỉ nhớ mã dự án (VD `JDHP001`). Khi nhập mã, backend DTO `CreateMasterPlanDto` có `@IsUUID()` (`wms-backend/src/master-plan/dto/create-master-plan.dto.ts:33`) → trả `400 project_id must be a UUID` → không thể hoàn thành tác vụ.

**Giải pháp:** Thay text input bằng **Searchable Dropdown (LOV — List of Values)** hiển thị `{project_code} — {project_name}`, UUID được gán ngầm phía sau. Component dùng chung (`<EntityPicker>`) cho mọi form chọn foreign-key trong hệ thống.

**Mục tiêu đo lường:** Error `project_id must be a UUID` về 0; thời gian tạo Master Plan giảm ≥ 50%.

---

## 1. User Stories

### US-MPL-01 — Tạo Master Plan cho dự án đang phụ trách
**Là** Project Manager (PM), **tôi muốn** mở form Tạo Master Plan, gõ mã/tên dự án vào ô "Dự án", thấy dropdown gợi ý, chọn bằng chuột hoặc Enter, **để** tạo kế hoạch năm mà không cần nhớ UUID.

**Acceptance Criteria:**
- Gõ ≥ 2 ký tự → dropdown hiện tối đa 20 gợi ý, sắp xếp theo mức khớp (match `project_code` ưu tiên hơn `project_name`).
- Mỗi dòng gợi ý hiển thị: `{project_code} — {project_name}` (subtext: tên tổ chức phụ trách).
- Sau khi chọn, ô input hiển thị `JDHP001 — Dự án JDHP Hà Nội`, state nội bộ giữ UUID.
- Submit form → payload gửi đúng UUID, không còn lỗi `project_id must be a UUID`.

### US-MPL-02 — PM không nhìn thấy dự án tổ chức khác (RBAC)
**Là** PM thuộc phòng ban A, **tôi không được phép** nhìn thấy dự án thuộc phòng ban B trong dropdown, **để** đảm bảo phân tách dữ liệu theo tổ chức.

**Acceptance Criteria:**
- Backend lookup filter theo `project.organization_id ∈ {organization của user đang login + các sub-organization (nếu có cây tổ chức)}`.
- PM nhập chính xác mã dự án của phòng ban khác → dropdown rỗng, không "leak" thông tin qua error message.
- Exception: user có privilege `MANAGE_PROJECTS` (hoặc privilege mới `VIEW_ALL_PROJECTS` nếu Product Owner quyết định — xem §7 Open Questions) được xem tất cả.

### US-MPL-03 — Nhập liệu nhanh bằng bàn phím
**Là** nhân viên nhập liệu phải tạo 20 Master Plan liên tục, **tôi muốn** thao tác không rời bàn phím: Tab vào ô dự án → gõ `JDHP` → ↓↓ chọn → Enter → tiếp tục sang field kế, **để** tăng tốc độ nhập liệu.

**Acceptance Criteria:**
- Focus vào input → typing thấy gợi ý ngay (debounce 250ms).
- Phím mũi tên ↑/↓ di chuyển giữa các gợi ý; Enter xác nhận; Escape đóng dropdown và giữ giá trị cũ.
- Tab sau khi chọn → focus sang field kế (year hoặc budget).
- Mobile / touch: tap ra ngoài dropdown = hủy (không đổi giá trị đã chọn trước đó).

### US-MPL-04 — Sửa Master Plan đã tồn tại → dropdown preload
**Là** user sửa Master Plan đã tạo, **tôi muốn** thấy dropdown hiển thị sẵn dự án đã chọn (`JDHP001 — Dự án JDHP Hà Nội`) ngay khi mở form, **để** biết mình đang sửa Plan của dự án nào mà không phải search lại.

**Acceptance Criteria:**
- Form ở mode edit (có `target.project_id`) → gọi `GET /projects/:id` hoặc endpoint lookup với `id=<uuid>` để resolve label.
- Label hiển thị đúng ngay lần render đầu (không flash "đang tải..." quá 200ms nếu dữ liệu đã cache).
- Nếu backend trả 404 (project bị xóa/archive) → hiện warning đỏ `Dự án không còn tồn tại. Vui lòng chọn lại.` và disable nút Cập nhật.

### US-MPL-05 — Admin cấp cao xem toàn portfolio
**Là** Admin có privilege `MANAGE_PROJECTS` (hoặc `VIEW_ALL_PROJECTS`), **tôi muốn** chọn dự án bất kỳ trên toàn hệ thống, **để** tạo Master Plan hộ phòng ban hoặc làm mẫu mock data.

**Acceptance Criteria:**
- Backend bỏ qua filter `organization_id` khi token có privilege đặc quyền.
- UI hiển thị badge nhỏ "Toàn bộ dự án" bên cạnh label field dropdown để Admin biết đang ở view toàn cục.
- Audit log: mỗi lần Admin tạo Master Plan cho dự án ngoài tổ chức của mình → log entry `created_by_admin_for_other_org=true`.

### US-MPL-06 — Gợi ý cảnh báo trùng Master Plan theo năm
**Là** PM chọn dự án đã có Master Plan năm `year` hiện tại, **tôi muốn** dropdown hiện dấu cảnh báo ngay ở dòng gợi ý (VD icon `⚠` + tooltip "Đã có Master Plan năm 2026"), **để** tránh submit bị backend trả `409 Conflict` và mất công nhập lại.

**Acceptance Criteria:**
- Backend lookup nhận thêm param `conflict_year=<year>`; nếu project đã có MP năm đó, field `has_conflict_in_year=true` được trả kèm mỗi item.
- UI disable chọn dự án đó (hoặc cho chọn nhưng hiện confirm dialog trước khi submit).
- Form mode edit: bỏ qua cảnh báo cho chính Plan đang sửa (tránh false-positive).

---

## 2. Business Rules

### BR-MPL-01 — Filter theo trạng thái vòng đời dự án
Dropdown **chỉ hiển thị project** có trạng thái nghiệp vụ "đang sống":
- **Lọc IN:** project có `status` ∈ {`WON_BID`, `ACTIVE`, `ON_HOLD`, `SETTLING`, `WARRANTY`} — đây là giai đoạn cần kế hoạch bảo trì/vận hành.
- **Lọc OUT:** `DRAFT` (chưa quyết định), `BIDDING` (chưa trúng thầu), `LOST_BID` (đã trượt), `SETTLED` (đã quyết toán), `RETENTION_RELEASED` (đã giải tỏa bảo lưu), `CANCELED` (đã hủy).

**Lưu ý mapping với instruction gốc:** Instruction user liệt kê `PLANNING / PERMITTING / CONSTRUCTION / MANAGEMENT` là 4 giá trị của field **`stage`** (giai đoạn IMPC nội bộ), trong khi `DRAFT / SETTLED / CANCELED` là 4 giá trị của field **`status`** (vòng đời hợp đồng). Đây là 2 field khác nhau trong schema `projects`. **Xem §7 Open Questions** — Product Owner cần chốt BR dùng field nào (khuyến nghị dùng `status` vì đây là field quyết định dự án có "sống" hay không).

### BR-MPL-02 — Unique constraint (project_id, year) hint
Entity `MasterPlan` có `@Index('IDX_MP_PROJECT_YEAR', ['project_id', 'year'], { unique: true })`. Khi user mở form với `year` đã chọn (mặc định = năm hiện tại), backend trả field `has_conflict_in_year` để UI cảnh báo trước submit.

### BR-MPL-03 — RBAC theo organization
- Lookup endpoint mặc định filter `project.organization_id IN (<org của user>, <sub-orgs nếu cây tổ chức phân cấp>)`.
- User có privilege `MANAGE_PROJECTS` (đã tồn tại trong enum `privilege.enum.ts:46`) được bypass filter, xem toàn hệ thống.
- **Không có** privilege `MANAGE_ALL_PROJECTS` trong hệ thống hiện tại — instruction gốc đề cập privilege này; BA đề xuất tái sử dụng `MANAGE_PROJECTS` hoặc thêm mới `VIEW_ALL_PROJECTS` (xem §7 Open Questions).
- User KHÔNG có quyền xem → lookup trả dataset rỗng, không bao giờ throw 403 để tránh lộ thông tin về sự tồn tại của dự án.

### BR-MPL-04 — Budget check sau khi chọn project
Sau khi chọn project + nhập `budget_vnd`, frontend gọi endpoint validate budget **trước khi submit** (non-blocking warning, không hard-block user):
- **Nền tảng:** `MasterPlan` và `WbsNode` không có field `category_id` — do thiết kế intentional (xem comment `master-plan.service.ts:79`: "Không dùng per-category checkBudgetLimit"). Rule gốc `dev-rules.md §2` ("Phải gọi `BudgetService.checkBudgetLimit()`") **không áp dụng trực tiếp** vì signature `checkBudgetLimit(projectId, categoryId, amount)` yêu cầu `categoryId`.
- **Rule thay thế:** BR-MP-04 đệ quy toàn cây tại `MasterPlanService.approve()` — Σ(root WBS budget) ≤ plan.budget_vnd (đã có).
- **Đề xuất bổ sung (bước tạo):** endpoint lookup trả kèm `project.total_budget` và `sum_active_plans_budget_vnd`. Frontend tính `remaining = total_budget - sum_active_plans` → nếu `budget_vnd > remaining` hiện warning vàng `Ngân sách vượt ${vnd(remaining)} VND còn lại của dự án — cần duyệt bổ sung.` (không hard-block).
- **Xem §7 Open Questions** — Product Owner cần chốt có hard-block ở bước `create` hay không (hiện tại chỉ block ở `approve`).

### BR-MPL-05 — Error message Việt ngữ nghiệp vụ
Mọi thông báo lỗi hiển thị cho end-user **không được** chứa tên field kỹ thuật, UUID format regex, hay stack trace. Mapping bắt buộc:

| Nguồn lỗi backend | Hiển thị end-user |
|---|---|
| `project_id must be a UUID` | `Vui lòng chọn dự án hợp lệ từ danh sách.` |
| `404 Project not found` | `Dự án không còn tồn tại. Vui lòng chọn lại.` |
| `409 Conflict — (project_id, year)` | `Dự án này đã có Master Plan năm {year}. Vui lòng chọn năm khác hoặc dự án khác.` |
| `403 Forbidden` (lookup trả rỗng) | (Không hiện gì — dropdown empty state `Không tìm thấy dự án khớp.`) |
| Network / 500 | `Không tải được danh sách dự án. Thử lại?` (kèm nút retry) |

Toàn bộ string tập trung trong 1 constants file (`shared/i18n/master-plan-lookup.constants.ts` hoặc tương đương) để hỗ trợ migration i18n tương lai.

### BR-MPL-06 — Loại bỏ UUID khỏi UI nhập liệu end-user
**Nguyên tắc chung (áp dụng cho toàn hệ thống):** Không có form nào dành cho end-user được hiển thị text input UUID thô. Thay vào đó dùng `<EntityPicker>` hoặc `<Select>` (với dataset nhỏ). Exception: admin tool / debug page (đánh dấu rõ "Dành cho kỹ thuật").

---

## 3. KPI Fields — đo lường hiệu quả feature

| # | KPI | Cách đo | Baseline (trước) | Target (sau) |
|---|---|---|---|---|
| K1 | **Thời gian trung bình tạo 1 Master Plan** | Từ mở dialog → submit thành công. Đo qua analytics event `master_plan_form_open` / `master_plan_form_submit_success`. | ~120s (user paste UUID từ URL/DB) | ≤ 30s |
| K2 | **Tỷ lệ lỗi `project_id must be a UUID`** | Count của error response code / tổng request `POST /master-plan`. | ~40% (đo qua sentry log) | 0% |
| K3 | **Master Plan tạo thành công / tuần** | Count row `master_plans.created_at ∈ last 7d`. | ~3-5 plan/tuần (hạn chế do UX) | ≥ 15 plan/tuần |
| K4 | **Form abandonment rate** | 1 − (submit_success_count / form_open_count). | > 50% | < 15% |
| K5 | **P95 latency endpoint lookup** | APM trace endpoint `GET /projects/lookup` response time, P95 percentile. | N/A (endpoint chưa có) | < 300ms @ 10k projects |
| K6 | **% dropdown suggestions được chọn bằng keyboard** | Event `picker_select_method=keyboard` / tổng `picker_select`. | N/A | ≥ 40% (dấu hiệu power user) |

**Hành động nếu KPI miss target sau 2 sprint:** Re-design (xem §7 Open Questions — có cần thêm filter bar như `organization`, `stage`, `status` không).

---

## 4. Ảnh hưởng đến Financials

| Khía cạnh | Ảnh hưởng | Chi tiết |
|---|---|---|
| **Hạch toán Nợ/Có** | ❌ Không | Feature thuần UX; không đổi schema `project_transactions`, `project_budgets`. |
| **Budget hard-limit** | ⚠️ Gián tiếp (xem BR-MPL-04) | Không đổi logic `ProjectsService.checkBudgetLimit()`; chỉ thêm warning sớm ở bước tạo Plan. Validation chặt vẫn nằm ở `MasterPlanService.approve()` qua BR-MP-04 tree rollup. |
| **CPI / SPI** | ❌ Không | CPI/SPI tính trên `WbsNode` + `WorkItem` actuals, không phụ thuộc cách chọn project. |
| **EVM (Earned Value)** | ❌ Không | Không đổi hạch toán PV/EV/AC. |
| **Revenue (POC method)** | ❌ Không | Không liên quan. |
| **Audit trail** | ✅ Có (positive) | Thêm log `admin_for_other_org=true` khi Admin chọn project ngoài tổ chức (US-MPL-05 AC) → tăng độ minh bạch kiểm toán. |
| **Dữ liệu bắt buộc cho báo cáo tài chính** | ❌ Không | `project_id` vẫn là UUID trong DB như cũ; chỉ đổi cách nhập ở UI. |

**Kết luận:** Feature **không tác động** đến cấu trúc tài chính / hạch toán. Budget check vẫn trigger đúng ở các bước phê duyệt hiện có.

---

## 5. Phạm vi mở rộng — các form khác dùng pattern `<EntityPicker>`

### 5.1 Survey kết quả

Khảo sát `wms-frontend/src` tìm các form có pattern text-input UUID hoặc có thể cải tiến bằng searchable picker:

| # | File | Field | Hiện trạng | Phân loại |
|---|---|---|---|---|
| 1 | `features/master-plan/ui/MasterPlanFormDialog.tsx:131` | `project_id` | Text input `placeholder="a1b2c3d4-..."` | **[IN-SCOPE]** — Mục tiêu chính |
| 2 | `features/incident/ui/CreateIncidentDialog.tsx:117` | `project_id` | Text input UUID | **[IN-SCOPE]** — áp dụng component chung |
| 3 | `features/office-task/ui/CreateOfficeTaskDialog.tsx:95` | `project_id` | Text input UUID | **[IN-SCOPE]** |
| 4 | `features/office-task/ui/CreateOfficeTaskDialog.tsx:103` | `assignee_id` | Text input UUID | **[IN-SCOPE]** — picker cho Employee |
| 5 | `features/energy-inspection/ui/CreateMeterDialog.tsx:110` | `project_id` | Text input UUID | **[IN-SCOPE]** |
| 6 | `pages/OfficeTasksPage.tsx:43` | `project_id` filter | Text input filter "Filter Project UUID" | **[IN-SCOPE]** — filter toolbar |
| 7 | `pages/IncidentsPage.tsx:69` | `project_id` filter | Text input filter | **[IN-SCOPE]** |
| 8 | `pages/EnergyMetersPage.tsx:44` | `project_id` filter | Text input filter | **[IN-SCOPE]** |
| 9 | `features/project/ui/CreateProjectDialog.tsx` | `organization_id`, `investor_id`, `manager_id`, `department_id` | Đang dùng `<Select>` non-searchable | **[OUT-OF-SCOPE / FUTURE]** — upgrade khi dataset > 30 items |
| 10 | `features/master-plan/ui/TaskTemplateFormDialog.tsx` | `system_id`, `equipment_item_id` | `<Select>` non-searchable (dataset nhỏ ~40) | **[OUT-OF-SCOPE]** — dataset đủ nhỏ |
| 11 | `features/user/ui/CreateUserDialog.tsx` | `employee_id`, `role_id` | `<Select>` non-searchable | **[FUTURE]** — upgrade khi > 100 nhân viên |
| 12 | `features/master-plan/ui/WbsNodeFormDialog.tsx` | `responsible_employee_id` | Cần check — có thể là Select | **[FUTURE]** |
| 13 | `features/incident/ui/*` — `request-reopen`, `request-assignee-change` | Approver picker | Chưa khảo sát sâu | **[FUTURE]** |
| 14 | `features/sales/ui/CreateSalesOrderDialog.tsx` | `customer_id`, `quote_id` | `<Select>` hoặc Text | **[FUTURE]** — upgrade khi khách hàng > 50 |
| 15 | `features/procurement/ui/CreatePoDialog.tsx` | `supplier_id`, `project_id`, `category_id` | Chưa khảo sát | **[FUTURE]** |
| 16 | `features/documents/ui/AddDocumentDialog.tsx` | `project_id` | Chưa khảo sát | **[FUTURE]** |
| 17 | `features/approvals/ui/*` | `approver_id` (nếu có Custom Routing) | Chưa khảo sát | **[FUTURE]** |

### 5.2 Phân loại IN-SCOPE / OUT-OF-SCOPE

**[IN-SCOPE] cho Sprint hiện tại (feature master-plan-project-lookup):**
- 8 điểm (#1-8 trong bảng trên) liên quan trực tiếp đến form nhập `project_id` (text UUID thô).
- Build 1 component chung `<EntityPicker entityType="project">` đủ tổng quát để sau này extend sang entity khác.

**[OUT-OF-SCOPE / FUTURE] — Phase B:**
- 9 form/page đã dùng `<Select>` (dataset nhỏ, chưa có nhu cầu search).
- Kế hoạch: sau khi component `<EntityPicker>` ổn định, migration sang mỗi khi gặp form có dropdown > 30 items hoặc user complain.

**Scope mở rộng bắt buộc của Sprint này:**
1. **Component chung** `<EntityPicker>` tham số hóa: `entityType`, `searchFn`, `labelFormat`, `valueField`, `disabledPredicate`, `placeholder`, `emptyMessage`.
2. **Endpoint lookup chung** (pattern): `GET /<entity>/lookup?q=<search>&limit=<n>&...` — chuẩn hóa cho mọi entity cần.

---

## 6. Non-Functional Requirements (NFRs)

### 6.1 Performance
- **P95 latency** endpoint `GET /projects/lookup`: **< 300ms** với dataset 10.000 projects.
- **Debounce** client-side: 250ms — tránh spam request khi user gõ nhanh.
- **Cache** React Query: `staleTime: 30s` cho cùng query, `gcTime: 5min` — giảm round-trip khi user mở/đóng dialog nhiều lần.
- **Paging server-side:** trả tối đa 20 item/request (đủ dùng cho typeahead, không tải toàn bộ 10k).

### 6.2 Accessibility (WCAG 2.1 AA)
- Keyboard navigation: Tab / Shift+Tab / ↑ / ↓ / Enter / Escape — đủ (US-MPL-03).
- `role="combobox"` + `aria-autocomplete="list"` + `aria-expanded` + `aria-activedescendant` trên input.
- Dropdown: `role="listbox"`, mỗi item `role="option"` với `aria-selected`.
- Selected state có contrast ≥ 4.5:1 (dùng token `--primary` Enterprise Blue sau khi đã migrate).
- Screen reader announce: `"Dự án, combobox. Gõ để tìm. 15 gợi ý."` khi focus vào input.

### 6.3 i18n Readiness
Dự án **chưa có** i18n framework (không ép setup trong scope này). Yêu cầu chuẩn bị:
- Tất cả string (label, placeholder, empty message, error message) tập trung trong 1 file: `wms-frontend/src/features/master-plan/constants/project-lookup.strings.ts` (hoặc tương đương).
- Không nhúng string tiếng Việt trực tiếp trong JSX nếu nó sẽ được i18n — dùng `import { STRINGS } from './project-lookup.strings'`.
- Khi Product Owner quyết định triển khai i18n (Phase B), migration chỉ cần wrap file strings bằng `i18next` hoặc tương đương.

### 6.4 Error Handling & Resilience
- Endpoint lookup fail (500/network) → dropdown hiện error state với nút "Thử lại" (tái sử dụng `QueryStateRow` pattern nếu có thể).
- Offline: graceful fallback hiện text `Mất kết nối. Vui lòng thử lại.`
- Timeout axios: dùng default 15s (đã cấu hình).

### 6.5 Compatibility
- Hỗ trợ Chrome/Edge/Firefox/Safari 2 phiên bản gần nhất.
- Mobile responsive (≥ 360px): dropdown full-width, font ≥ 14px để dễ đọc.

### 6.6 Security
- Endpoint lookup yêu cầu `@UseGuards(JwtAuthGuard, PrivilegeGuard)` + `@RequirePrivilege('VIEW_PROJECTS')`.
- Input `q` (search) sanitize để tránh SQL injection — dùng parameterized query (TypeORM QueryBuilder `.where(':q', { q: ... })`).
- Rate limit: tái sử dụng ThrottlerModule global (100 req/60s) — đủ cho typeahead.

---

## 7. Open Questions — cần Product Owner / Tech Advisor confirm

| # | Câu hỏi | Lý do | BA đề xuất |
|---|---|---|---|
| Q1 | BR-MPL-01 filter theo field `stage` hay `status`? Instruction gốc liệt kê `PLANNING/PERMITTING/CONSTRUCTION/MANAGEMENT` (là `stage`) và `DRAFT/SETTLED/CLOSED/CANCELLED` (là `status`) — đây là 2 field khác nhau. | Schema `projects` tách `stage` (giai đoạn IMPC nội bộ) và `status` (vòng đời hợp đồng). Không thể filter cùng lúc cả 2 mà không conflict logic. | **Dùng `status`** để filter (là field quyết định dự án có "sống" hay không). Stage chỉ dùng để sort / nhóm hiển thị. Chờ Product Owner chốt. |
| Q2 | Privilege tên `MANAGE_ALL_PROJECTS` được instruction đề cập không tồn tại trong hệ thống. Dùng gì? | Privilege hiện có: `MANAGE_PROJECTS` (write), `VIEW_PROJECTS` (read-only). Không có privilege "xem toàn hệ thống bỏ qua RBAC org". | **Option A (nhanh):** tái sử dụng `MANAGE_PROJECTS` làm "super view". **Option B (sạch):** thêm privilege mới `VIEW_ALL_PROJECTS` + seed migration + gán cho role `SUPER_ADMIN`. Đề xuất Option B. |
| Q3 | Budget check ở bước `create` Master Plan: **warning** hay **hard-block**? | BR-MP-04 hiện chỉ chạy ở `approve()`. Nếu block sớm ở `create`, user có thể muốn tạo draft để iterate trước khi approve. | **Warning (không hard-block).** Giữ `create` mở, chỉ `approve` block. Confirm với Product Owner. |
| Q4 | Cây tổ chức phân cấp: nếu user thuộc phòng ban cha, có được xem project của phòng ban con không? | Có 2 model — phẳng (chỉ org của user) hoặc cây (org + descendants). Code hiện chưa clear. | **Xem cây (org + descendants)** là đúng nghiệp vụ. Cần verify `organizations` entity có field `parent_id` hay không. |
| Q5 | Endpoint lookup nên là `GET /projects/lookup` (mới) hay mở rộng `GET /projects` (cũ)? | Endpoint `/projects` hiện trả full entity (nặng, không paging). Thêm `/lookup` nhẹ hơn (chỉ `id`, `project_code`, `project_name`, `organization.name`, `has_conflict_in_year`) — chuẩn LOV. | **Endpoint mới `GET /projects/lookup`** — gate cho Gate 2 SA_DESIGN. |
| Q6 | Component `<EntityPicker>` đặt ở tầng nào trong FSD? | Theo FSD: `shared/ui` nếu generic hoàn toàn, `entities/<entity>/ui` nếu chỉ dùng 1 entity. Component này phải đủ generic để dùng cho project/employee/supplier/etc. | **`shared/ui/EntityPicker.tsx`** — tham số hóa `searchFn` + `labelFormat`, không phụ thuộc entity cụ thể. |
| Q7 | Khi Admin chọn dự án ngoài tổ chức của mình (US-MPL-05), có cần confirm dialog "Bạn đang tạo Master Plan cho dự án ngoài tổ chức. Xác nhận?" không? | Tăng an toàn nhưng cản tốc độ thao tác Admin power user. | **Không confirm dialog**, chỉ log audit. Hiện badge "Toàn bộ dự án" ở UI là đủ cảnh báo visual. |

---

## Checklist hoàn thành (theo `.claude/rules/ba-rules.md`)

- [x] User Stories đã liệt kê đầy đủ (6 stories, vượt target ≥ 5)
- [x] Business Rules rõ ràng, có rule về budget check (BR-MPL-04)
- [x] KPI fields được xác định (6 metrics, vượt target ≥ 4)
- [x] Ảnh hưởng đến Financials (Costing/Billing/EVM) đã được đánh giá — không ảnh hưởng cấu trúc
- [x] Scope mở rộng (các form khác) đã được survey và phân loại IN/OUT (17 điểm, 8 IN-SCOPE, 9 FUTURE)
- [x] NFRs: performance (P95 < 300ms), a11y (WCAG 2.1 AA), i18n readiness (strings tập trung)
- [x] Open Questions đã liệt kê cho Product Owner confirm (7 câu)

## Deliverables sau khi duyệt

1. **Gate 2 (SA Design):** `docs/features/master-plan-project-lookup/SA_DESIGN.md`
   - Thiết kế endpoint `GET /projects/lookup` (request params, response schema, index DB, test plan).
   - Thiết kế component `<EntityPicker>` (props, state machine, keyboard behavior).
2. **Gate 3 (UI Design):** `docs/features/master-plan-project-lookup/UI_SPEC.md`
   - Wireframe 4 state (empty/loading/results/error).
   - State matrix cho typeahead.
3. **Gate 4 (Dev):** code + unit test.
4. **Gate 5 (Test):** manual verification + a11y audit (axe DevTools).
5. **Gate 6 (Deploy):** migration privilege (nếu Option B Q2), release note.

---

**Người phân tích:** BA Agent
**Review trước Gate 2:** Tech Advisor (Duy) duyệt Open Questions + scope
