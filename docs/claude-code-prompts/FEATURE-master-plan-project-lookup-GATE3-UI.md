# CLAUDE CODE CLI — LỆNH THỰC THI
## Gate 2.5 (SA Revision) + Gate 3 (UI/UX Design)
## Feature: `master-plan-project-lookup`

---

## TECH ADVISOR DECISIONS — 7 CONCERNS

Đã duyệt. Áp dụng chính xác:

| # | Quyết định |
|---|---|
| **C1** | ✅ Giữ `status: true` (boolean) theo TransformInterceptor. Revise BA_SPEC §5. |
| **C2** | ✅ V1 dùng `project.budget`. Backlog ticket `BUDGET-HEADROOM-ACCURATE-CALC` cho V2. |
| **C3** | 🔧 **OVERRIDE**. `user.contexts` là `string[]`, KHÔNG phải object. Verified tại `wms-backend/src/auth/types/authenticated-request.ts:9`. Đổi filter: `p.organization_id IN (:...contexts)` thay vì `= :orgId`. |
| **C4** | ✅ Accept. Dev Gate 4 install `cmdk`. |
| **C5** | ✅ Accept. Backlog `ORG-HIERARCHY-VISIBILITY`. |
| **C6** | ✅ Accept. V1 dùng global ThrottlerModule, V2 backlog. |
| **C7** | 🔧 **OVERRIDE**. Bật `unaccent` trong V1. ERP Việt Nam yêu cầu search không dấu → có dấu. `unaccent` extension đã enable từ migration 33. Dùng `unaccent(LOWER(project_name)) ILIKE unaccent(LOWER(:q))`. |

---

## ROLE ASSIGNMENT

Bạn lần lượt đóng vai:
1. **SA** (Gate 2.5) — revise SA_DESIGN theo 3 override trên.
2. **UI/UX Designer** (Gate 3) — viết UI_SPEC.

BẮT BUỘC đọc trước:
1. `.claude/rules/ui-ux-designer-rules.md`
2. `docs/features/master-plan-project-lookup/BA_SPEC.md`
3. `docs/features/master-plan-project-lookup/SA_DESIGN.md` (bản hiện tại)
4. `wms-frontend/CLAUDE.md`
5. `.claude/rules/sa-rules.md` (để biết phạm vi revise)

---

## PRE-FLIGHT CHECK

```bash
cd D:\SHERP\SHERP
git branch --show-current
git status
```

Verify:
- Đang ở branch `feature/master-plan-project-lookup`
- Working tree sạch
- Nếu không ở đúng branch → `git checkout feature/master-plan-project-lookup`

---

## PHASE 1 — GATE 2.5: REVISE SA_DESIGN

### 1.1 Sửa SA_DESIGN.md theo 3 override (C1, C3, C7)

**C1 — Ghi chú BA_SPEC revision:**

Trong `docs/features/master-plan-project-lookup/SA_DESIGN.md` §3.1.2, đổi ghi chú "SA chọn tuân theo interceptor" thành:

> **✅ Tech Advisor đã duyệt (2026-04-22):** Giữ `status: true` (boolean). BA_SPEC §5 sẽ revise để đồng bộ. Không đổi `TransformInterceptor`.

**C3 — Fix `user.contexts` shape:**

Trong `docs/features/master-plan-project-lookup/SA_DESIGN.md`:

**§6.1 Pseudo-code** — đổi đoạn:
```diff
- const bypassOrgFilter = user.privileges.includes('VIEW_ALL_PROJECTS');
+ const bypassOrgFilter = user.privileges.includes('VIEW_ALL_PROJECTS');
+ const userContexts: string[] = user.contexts ?? [];

  if (!bypassOrgFilter) {
-   qb.andWhere('p.organization_id = :orgId', { orgId: user.contexts?.organization_id });
+   if (userContexts.length === 0) {
+     // User không có context nào → trả rỗng (anti-leak, §7.2)
+     qb.andWhere('1=0');
+   } else {
+     qb.andWhere('p.organization_id IN (:...contexts)', { contexts: userContexts });
+   }
  }
```

**§7.1 Privilege logic** — đổi bảng:
```diff
- | Chỉ `VIEW_PROJECTS` | Filter `organization_id = user.contexts.organization_id`. |
+ | Chỉ `VIEW_PROJECTS` | Filter `organization_id IN (user.contexts[])`. Nếu `contexts=[]` → trả rỗng (anti-leak). |
```

**§7.3 Cross-org logic** — đổi đoạn:
```diff
- const actorOrgId = ctx.user.contexts?.organization_id;
- const crossOrg = project.organization_id && project.organization_id !== actorOrgId;
+ const actorContexts: string[] = ctx.user.contexts ?? [];
+ const crossOrg = project.organization_id
+   ? !actorContexts.includes(project.organization_id)
+   : false;
```

Và update audit log payload:
```diff
  newData: {
    project_id: saved.project_id,
    project_org_id: project.organization_id,
-   actor_org_id: actorOrgId,
+   actor_contexts: actorContexts,
  },
```

**§12 Concerns** — đánh dấu đã resolve:
```diff
### C3 — `user.contexts.organization_id` — nguồn field chưa rõ
+ **✅ RESOLVED (2026-04-22):** Verified qua `auth/types/authenticated-request.ts:9` và `auth/jwt.strategy.ts:29` — `contexts: string[]` là mảng organization_ids user có quyền truy cập. SA design đã update: filter `IN (:...contexts)` thay vì `= :orgId`. Dev Gate 4 vẫn verify `AuthService.login()` aggregate contexts đúng như payload.
```

**C7 — Bật unaccent V1:**

**§6.1 Pseudo-code** — đổi query search:
```diff
  if (dto.q && dto.q.length >= 2) {
-   qb.andWhere(
-     '(LOWER(p.project_code) LIKE :q OR LOWER(p.project_name) LIKE :q)',
-     { q: `%${dto.q.toLowerCase()}%` },
-   );
+   // project_code là ASCII → LOWER đủ
+   // project_name có thể có dấu Tiếng Việt → unaccent cả 2 vế
+   qb.andWhere(
+     `(
+        LOWER(p.project_code) LIKE :q
+        OR unaccent(LOWER(p.project_name)) LIKE unaccent(:q)
+      )`,
+     { q: `%${dto.q.toLowerCase()}%` },
+   );
  }
```

**§9.2 Index plan** — cập nhật bảng, thêm index cho unaccent:

| # | Index | Phân kỳ | Lý do |
|---|---|---|---|
| 1 | `idx_projects_code_lower ON projects (LOWER(project_code))` | V1 | Prefix match trên mã |
| 2 | `idx_projects_status ON projects (status) WHERE deleted_at IS NULL` | V1 | Partial index |
| 3 | `idx_projects_org_status ON projects (organization_id, status) WHERE deleted_at IS NULL` | V1 | Composite cho non-admin |
| 4 | `idx_projects_name_unaccent_trgm ON projects USING gin (unaccent(LOWER(project_name)) gin_trgm_ops)` | **V1** (đã đưa lên từ V2) | Hỗ trợ `unaccent(LOWER(name)) LIKE` — bắt buộc để search không dấu nhanh ở 10k rows. `pg_trgm` đã enable. |

**Lưu ý kỹ thuật quan trọng:**
- Index dùng hàm `unaccent()` đòi hỏi `unaccent` phải là **IMMUTABLE**. Default `unaccent` là `STABLE` → không index được trực tiếp. Phải tạo wrapper:

```sql
CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS $$
  SELECT public.unaccent('public.unaccent', $1);
$$;
```

Và dùng `f_unaccent` thay `unaccent` trong index + query. **Cập nhật pseudo-code + migration** tương ứng.

**§12 Concerns** — đánh dấu C7 đã resolve:
```diff
### C7 — `search_vector` + `unaccent` đã enable
+ **✅ RESOLVED (2026-04-22):** Tech Advisor override — bật unaccent V1 vì UX critical với user Việt Nam. Đã update §6.1 query + §9.2 index plan + bổ sung `f_unaccent()` IMMUTABLE wrapper.
```

**§9.3 EXPLAIN hint** — update query mẫu dùng `f_unaccent` thay vì raw LOWER trên project_name.

### 1.2 Update `1776300000013-AddViewAllProjectsPrivilege.ts` migration content

Thêm vào `up()` migration:

```typescript
// 1. Create IMMUTABLE unaccent wrapper (idempotent)
await queryRunner.query(`
  CREATE OR REPLACE FUNCTION public.f_unaccent(text) RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS $$
    SELECT public.unaccent('public.unaccent', $1);
  $$;
`);

// 2. Seed privilege (existing content)
await queryRunner.query(`INSERT INTO privileges ...`);

// 3. Index for lookup performance
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
```

Note: index `CREATE INDEX` không dùng `CONCURRENTLY` trong migration (TypeORM chạy trong transaction — `CONCURRENTLY` không tương thích). Chấp nhận brief lock ở deploy time, bảng projects không quá lớn.

`down()` drop theo thứ tự ngược lại.

### 1.3 Commit Gate 2.5

```bash
git add docs/features/master-plan-project-lookup/SA_DESIGN.md
git commit -m "docs(master-plan): revise SA_DESIGN per Tech Advisor review (Gate 2.5)

- Fix user.contexts shape: string[] (not object) per authenticated-request.ts:9
- Change org filter from equality to IN (...contexts)
- Enable unaccent V1 for Vietnamese UX (ERP critical requirement)
- Add f_unaccent() IMMUTABLE wrapper for indexable accent-free search
- Elevate idx_projects_name_unaccent_trgm from V2 to V1
- Resolve Concerns C3 and C7; keep C1/C2/C4/C5/C6 as originally designed

Refs: #master-plan-project-lookup
Gate-2-Approved-By: Tech Advisor"
```

---

## PHASE 2 — GATE 3: VIẾT UI_SPEC

### 2.1 Deliverable

Tạo `docs/features/master-plan-project-lookup/UI_SPEC.md` tuân thủ tuyệt đối `.claude/rules/ui-ux-designer-rules.md`.

### 2.2 Nội dung bắt buộc

#### §1. Executive Summary (≤ 8 dòng)

Mô tả ngắn: scope UI thay đổi (form Master Plan), component mới (ProjectPicker/EntityPicker), design token áp dụng.

#### §2. Design Token References

Vì SH-GROUP ERP dùng shadcn/ui + Tailwind — KHÔNG phải Ant Design/Mantine/MUI như rule khuyến nghị. Ghi rõ:
- Lý do giữ shadcn (đã có sẵn, không mix 2 thư viện).
- Map design token từ rule → Tailwind tokens:

| Token từ rule | Tailwind / shadcn token |
|---|---|
| Primary `#0a6ed1` | `--primary` (shadcn theme variable) |
| Semantic Warning `#e9730c` | `--warning` hoặc `bg-amber-500` |
| Semantic Error `#bb0000` | `--destructive` |
| Text primary `#1e2329` | `--foreground` |
| Border `#d9d9d9` | `--border` |
| Spacing 8/12/16/24 | Tailwind `p-2/p-3/p-4/p-6` |

Verify `tailwind.config` hiện có đủ design token chưa. Nếu thiếu → flag cho Dev Gate 4 bổ sung (không tự sửa config ở gate này).

#### §3. Wireframe — 3 screens chính

Dùng Mermaid hoặc ASCII art (Figma link nếu có). Bắt buộc:

**Screen 1: MasterPlanFormDialog (CREATE mode)**
- Layout 2 cột: label trái (1/3) + input phải (2/3) per rule.
- `<ProjectPicker>` ở vị trí field `project_id` cũ.
- Required marker `*` đỏ.
- Help text dưới field: "Gõ mã hoặc tên dự án để tìm".

**Screen 2: ProjectPicker dropdown expanded**
- Input có placeholder "Chọn dự án...".
- Khi focus + chưa gõ → hiển thị 20 project recent/top.
- Khi gõ ≥2 ký tự → debounce 300ms → fetch → hiện kết quả.
- Mỗi option: `{code} — {name}` dòng chính + `{stage_label} · {organization_name}` dòng phụ nhỏ hơn (`text-xs text-muted-foreground`).
- Keyboard highlight row hiện tại.

**Screen 3: Cross-org warning banner**
- Xuất hiện bên dưới ProjectPicker khi chọn project khác org.
- Component: `<Alert variant="warning">` với icon `AlertTriangle`.
- Text: *"Dự án này thuộc tổ chức **{organization_name}** — khác tổ chức của bạn."*

Wireframe mỗi screen cần chú thích: vị trí, dimensions, spacing, typography scale.

#### §4. Component Spec — 4 states matrix (BẮT BUỘC đủ)

Bảng chi tiết cho mỗi state:

| Component | State | Trigger | Visual | Copy (VI) | A11y |
|---|---|---|---|---|---|
| ProjectPicker | **Default** | Chưa focus | Input với placeholder | "Chọn dự án..." | `aria-label="Chọn dự án"` |
| ProjectPicker | **Loading** | `isFetching=true` | Skeleton 5 rows trong dropdown | "Đang tìm..." | `aria-busy="true"` |
| ProjectPicker | **Empty** | `items=[]` sau search | Illustration + text | "Không tìm thấy dự án khớp. Thử từ khóa khác." | role="status" |
| ProjectPicker | **Error** | API fail / network | Red border + toast + retry | "Không tải được danh sách. Nhấn để thử lại." | role="alert" |
| ProjectPicker | **Selected** | `value != null` | Label `{code} — {name}` + nút X | — | — |
| ProjectPicker | **Disabled** | `disabled=true` | Gray background, not clickable | — | `aria-disabled="true"` |
| ProjectPicker | **Edit mode preload** | Form mount với `value=uuid` | Skeleton → label thật, hoặc "Dự án không còn tồn tại" (404) | — | — |
| ProjectPicker | **Cross-org** | Chọn org khác | Banner warning bên dưới | "Dự án này thuộc tổ chức **X** — khác tổ chức của bạn." | role="status" |
| MasterPlanFormDialog | **Submit success** | POST 201 | Close dialog + toast success | "Đã tạo Master Plan thành công." | — |
| MasterPlanFormDialog | **Budget warning** | Response `warning: true` | Banner vàng phía trên submit | "Ngân sách vượt {X} VND còn lại — cần duyệt bổ sung." | role="status" |

#### §5. Interaction Map

Flow diagram (Mermaid) hoặc bảng:

1. User mở dialog → 2. Focus vào Project field → 3. Gõ "jdhp" → 4. Debounce 300ms → 5. API call → 6. Render dropdown → 7. User ↓↓ chọn item → 8. Enter → 9. Cross-org check → 10. Nếu cross-org → hiện banner → 11. User submit → 12. Budget check → 13. Có warning → hiện banner vàng (không block) → 14. Nút "Tạo" vẫn click được → 15. Server create → 16. Close dialog.

Error flows:
- Network fail ở lookup → toast + retry button
- 403 ở create (edge case) → toast "Không có quyền"
- 409 (trùng `project_id + year`) → inline error "Dự án này đã có Master Plan năm X"

#### §6. Keyboard & A11y (WCAG 2.1 AA)

Checklist:
- [ ] Tab order logic: Code → Name → Year → **ProjectPicker** → Budget → Start date → End date → Hủy → Tạo
- [ ] ProjectPicker keyboard: `↑↓` navigate, `Enter` select, `Escape` close, `Tab` commit current, `Backspace` khi input rỗng + có value → clear
- [ ] Contrast ratio ≥ 4.5:1 cho text, ≥ 3:1 cho border
- [ ] Focus ring 2px solid `--primary`, không `outline: none`
- [ ] Screen reader: mỗi option đọc `"JDHP001, Dự án JDHP Hà Nội, giai đoạn Construction, tổ chức Phòng Kỹ thuật"`
- [ ] Banner warning có `role="status"` hoặc `role="alert"`

#### §7. Responsive Breakpoints

- **≥1280 (desktop primary):** layout 2 cột, dialog width 640px
- **≥768 (tablet):** layout 1 cột, label trên input, dialog width 90vw
- **≥360 (mobile):** full screen dialog, sticky header + footer, read-only nếu user chưa được cấp quyền tạo trên mobile (theo rule UI §7 — ERP mobile ưu tiên read-only; nhưng form này là write → chấp nhận fully functional vì dialog không quá phức tạp)

#### §8. Copy Catalog (tập trung)

Liệt kê **mọi** string Việt ngữ dùng trong UI. Mỗi string có:
- Key (camelCase)
- Text Việt
- Context sử dụng

Ví dụ:
```typescript
export const PROJECT_LOOKUP_STRINGS = {
  placeholder: 'Chọn dự án...',
  loadingText: 'Đang tìm...',
  emptyText: 'Không tìm thấy dự án khớp. Thử từ khóa khác.',
  errorText: 'Không tải được danh sách. Nhấn để thử lại.',
  crossOrgWarning: (orgName: string) =>
    `Dự án này thuộc tổ chức **${orgName}** — khác tổ chức của bạn.`,
  projectNotFound: 'Dự án không còn tồn tại.',
  budgetWarning: (remaining: string) =>
    `Ngân sách vượt ${remaining} VND còn lại — cần duyệt bổ sung.`,
  // ... full list
} as const;
```

File đích: `wms-frontend/src/features/master-plan/constants/project-lookup.strings.ts` (theo SA §4.2).

#### §9. Screens/Mockup không trong scope

Liệt kê những gì **KHÔNG** thiết kế ở UI_SPEC này:
- Trang `/projects` (list) — không đổi
- Các form khác đang dùng UUID text input — sẽ có UI_SPEC riêng khi migrate
- Admin tool quản lý privilege — ngoài scope feature này

#### §10. Visual QA Checklist

- [ ] Không hardcode hex color trong Tailwind classes (phải dùng variable `--primary`, `--warning`, v.v.)
- [ ] Không dùng emoji trong production UI
- [ ] Không animation > 200ms (rule §1)
- [ ] Dropdown `shadow-md` không glassmorphism
- [ ] Font: Inter (đã set trong tailwind config) — verify
- [ ] Test axe DevTools: 0 critical issue

### 2.3 Checklist hoàn thành (theo `ui-ux-designer-rules.md`)

- [ ] Dùng design token, không hardcode
- [ ] Wireframe đủ 3 screens (Create form / Dropdown expanded / Cross-org banner)
- [ ] 4 state Default/Loading/Empty/Error + các state bổ sung (Selected/Disabled/Edit preload/Cross-org/Budget warning)
- [ ] Kiểm tra contrast WCAG AA
- [ ] Component từ shadcn/ui (không vẽ lại)
- [ ] Đối chiếu BA_SPEC — mọi User Story có UI tương ứng
- [ ] Đối chiếu SA_DESIGN — form field khớp DTO

### 2.4 Commit Gate 3

```bash
git add docs/features/master-plan-project-lookup/UI_SPEC.md
git commit -m "docs(master-plan): add UI_SPEC for project lookup feature (Gate 3)

- Design ProjectPicker component with 8 state variants
- Map enterprise design tokens to shadcn/ui + Tailwind
- Specify keyboard navigation and WCAG 2.1 AA compliance
- Catalog all Vietnamese UI strings centrally
- Document responsive behavior for desktop/tablet/mobile
- Define interaction map with error flows

Refs: #master-plan-project-lookup
Gate-3-Ready-For-Review: true"
```

---

## EXECUTION PROTOCOL

1. **Bước 1:** Pre-flight check.
2. **Bước 2:** Đọc 5 file rule/spec.
3. **Bước 3:** PHASE 1 — Revise SA_DESIGN (C1 annotation + C3 fix + C7 unaccent).
4. **Bước 4:** Commit Gate 2.5.
5. **Bước 5:** PHASE 2 — Viết UI_SPEC full 10 sections.
6. **Bước 6:** Commit Gate 3.
7. **Bước 7:** DỪNG. Báo cáo:
   - Branch + commits
   - SA_DESIGN đã update những dòng nào (line range)
   - UI_SPEC location + tóm tắt 5 dòng
   - Open Questions (nếu có)
   - Next: Gate 4 (Dev implementation) — đợi Tech Advisor approval

### TUYỆT ĐỐI KHÔNG ĐƯỢC

- KHÔNG tạo file code `.ts` / `.tsx` trong `src/`.
- KHÔNG chạy migration thật.
- KHÔNG push lên remote (`main` hay branch). Chỉ commit local.
- KHÔNG sửa `BA_SPEC.md` (Tech Advisor sẽ revise riêng nếu cần).
- KHÔNG vẽ lại component shadcn đã có.
- KHÔNG dùng màu hex raw trong UI_SPEC — chỉ reference token.
- KHÔNG tự sang Gate 4.

---

## MA TRẬN PHÂN LOẠI THAY ĐỔI — NHẮC LẠI (đã gửi ở Gate 2)

Claude Code PHẢI ghi nhớ và áp dụng cho mọi PR sau:

| Loại | Gate bắt buộc |
|---|---|
| Hotfix / Bug thật | Gate 4 + 5 |
| UX polish | Gate 3 (short) + 4 |
| Schema / API nhỏ | Gate 2 + 4 + 5 |
| Feature / UX redesign | **Đủ 6 Gate** |
| Chore / Infra / Docs | Gate 6 hoặc bỏ qua |
| Security / Privilege | Gate 2 + 4 + 5 + 6 |
| Data Migration | Gate 2 + 4 + 5 + 6 |

Feature hiện tại = **Feature / UX redesign**. Đang Gate 3.

---

**Bắt đầu từ Bước 1.**
