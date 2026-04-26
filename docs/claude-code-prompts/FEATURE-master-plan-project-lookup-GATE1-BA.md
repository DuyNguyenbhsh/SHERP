# CLAUDE CODE CLI — LỆNH THỰC THI
## Gate 1: Business Analysis
## Feature: `master-plan-project-lookup`

---

## ROLE ASSIGNMENT

Bạn đang đóng vai **Business Analyst (BA)** cho dự án SH-GROUP ERP.

Trước khi bắt đầu, BẮT BUỘC đọc theo thứ tự:
1. `CLAUDE.md` (root) — quy trình 6-Gate
2. `.claude/rules/ba-rules.md` — tiêu chuẩn BA
3. `wms-backend/CLAUDE.md` mục 11 — Cross-Stack Sync Protocol
4. `wms-frontend/CLAUDE.md` — FSD architecture

---

## BỐI CẢNH NGHIỆP VỤ

**Vấn đề hiện tại:**
Form "Tạo Master Plan" (`wms-frontend/src/features/master-plan/ui/MasterPlanFormDialog.tsx`) đang yêu cầu user nhập tay UUID vào field `Project UUID`. User thực tế không có UUID — họ chỉ biết mã dự án nghiệp vụ (ví dụ `JDHP001`). Khi nhập mã, backend trả lỗi `project_id must be a UUID` → tác vụ không thể hoàn thành.

**Giải pháp dự kiến:**
Thay text input bằng **Searchable Dropdown (LOV — List of Values)** hiển thị `{Mã dự án} — {Tên dự án}`, UUID được gán ngầm phía sau. Component này sẽ dùng chung cho tất cả form nhập foreign-key trong hệ thống (project, user, template, resource, v.v.).

**Bằng chứng hiện trạng:**
- Backend DTO: `wms-backend/src/master-plan/dto/create-master-plan.dto.ts` — có `@IsUUID() project_id`.
- Frontend form: field `project_id` đang là plain `<Input>` (dòng ~131-137).
- Đã có `GET /projects` và hook `useProjects()` nhưng chưa có endpoint lookup tối ưu (search + paging + filter).

---

## NHIỆM VỤ CHÍNH

Tạo file `docs/features/master-plan-project-lookup/BA_SPEC.md` tuân thủ tuyệt đối `.claude/rules/ba-rules.md`.

### Nội dung bắt buộc có trong BA_SPEC.md

#### 1. User Stories (tối thiểu 5)
- Project Manager tạo Master Plan cho dự án đang phụ trách
- Project Manager KHÔNG thấy được dự án thuộc tổ chức khác (RBAC)
- Nhân viên nhập liệu nhanh: gõ vài ký tự → autocomplete → chọn bằng Enter
- User sửa Master Plan đã tồn tại → dropdown hiển thị sẵn dự án đã chọn
- Admin (có `MANAGE_ALL_PROJECTS`) chọn được bất kỳ dự án nào

#### 2. Business Rules
- Chỉ project có trạng thái `PLANNING`, `PERMITTING`, `CONSTRUCTION`, `MANAGEMENT` được phép chọn khi tạo Master Plan. Các trạng thái `DRAFT`, `SETTLED`, `CLOSED`, `CANCELLED` bị ẩn khỏi LOV.
- Unique constraint `(project_id, year)` phải được validate ở UI trước khi submit (hint trong dropdown nếu project đã có MP năm đó).
- RBAC: filter theo `organization_id` của user đang login. Trừ khi user có privilege `MANAGE_ALL_PROJECTS`.
- Budget của Master Plan KHÔNG được vượt budget còn lại của project. Phải gọi `BudgetService.checkBudgetLimit()` theo đúng dev-rules.md.
- Error message phải là Việt ngữ nghiệp vụ, không lộ tên field kỹ thuật. Ví dụ chuyển `"project_id must be a UUID"` → `"Vui lòng chọn dự án hợp lệ"`.

#### 3. KPI Fields cần đo lường
- Thời gian trung bình tạo 1 Master Plan (trước vs sau)
- Tỷ lệ error `project_id must be a UUID` (mục tiêu: về 0)
- Số Master Plan tạo thành công / tuần
- Tỷ lệ bỏ dở form (form abandonment rate)

#### 4. Ảnh hưởng Financials
- Không thay đổi cấu trúc budget hay hạch toán Nợ/Có.
- Phải đảm bảo budget check vẫn trigger đúng sau khi user chọn project.
- Ghi rõ các luồng CPI/SPI/EVM có bị ảnh hưởng không (kỳ vọng: không).

#### 5. Phạm vi mở rộng — các form khác dùng pattern LOV
Liệt kê (khảo sát nhanh codebase):
- WBS Node Form
- Task Template Form
- Document → Project linkage
- Approval Routing (nếu có chọn người duyệt)
- Employee assignment forms

Đánh dấu `[IN-SCOPE]` / `[OUT-OF-SCOPE / FUTURE]` cho từng form.

#### 6. Non-Functional Requirements
- Response time của endpoint lookup: P95 < 300ms với dataset 10.000 projects.
- Accessibility: WCAG 2.1 AA (keyboard navigation, screen reader).
- i18n: toàn bộ label/placeholder/error message bằng tiếng Việt (dự án hiện chưa có i18n framework → không ép setup, chỉ yêu cầu string tập trung trong 1 constants file để migration i18n sau này dễ).

---

## CHECKLIST HOÀN THÀNH (theo ba-rules.md)

- [ ] User Stories đã liệt kê đầy đủ (≥ 5)
- [ ] Business Rules rõ ràng, có rule về budget check
- [ ] KPI fields được xác định (≥ 4 metrics)
- [ ] Ảnh hưởng đến Financials (Costing/Billing/EVM) đã được đánh giá
- [ ] Scope mở rộng (các form khác) đã được survey và phân loại IN/OUT
- [ ] NFRs: performance, a11y, i18n

---

## EXECUTION PROTOCOL — ĐỌC KỸ

1. **BƯỚC 1:** Đọc đủ 4 file quy tắc ở mục ROLE ASSIGNMENT.
2. **BƯỚC 2:** Đọc 2 file code thực tế để hiểu data model:
   - `wms-frontend/src/features/master-plan/ui/MasterPlanFormDialog.tsx`
   - `wms-backend/src/master-plan/dto/create-master-plan.dto.ts`
   - `wms-backend/src/master-plan/entities/master-plan.entity.ts`
   - `wms-frontend/src/entities/project/types.ts`
3. **BƯỚC 3:** Khảo sát nhanh codebase tìm các form khác có pattern UUID text input tương tự (dùng grep). Liệt kê kết quả trong mục 5 của BA_SPEC.
4. **BƯỚC 4:** Viết `docs/features/master-plan-project-lookup/BA_SPEC.md`.
5. **BƯỚC 5:** DỪNG. Báo cáo:
   - Đường dẫn file đã tạo
   - Tóm tắt 3-5 dòng những business rule/risk đáng chú ý nhất
   - Câu hỏi mở (nếu có) để Tech Advisor / Product Owner confirm

### TUYỆT ĐỐI KHÔNG ĐƯỢC LÀM
- KHÔNG tạo bất kỳ file code nào trong `src/`.
- KHÔNG sửa file cấu hình, CLAUDE.md, hay bất kỳ file nào khác ngoài deliverable mục 4.
- KHÔNG tự nhảy sang Gate 2 (SA_DESIGN) — đợi Tech Advisor duyệt.
- KHÔNG viết tiếng Anh trong phần hướng tới end-user.

---

## COMMIT

Sau khi Tech Advisor duyệt BA_SPEC, commit theo Conventional Commits:

```
docs(master-plan): add BA_SPEC for project lookup feature (Gate 1)

- Define user stories and RBAC-aware business rules
- List KPI metrics for measuring UX improvement
- Survey other forms that will adopt EntityPicker pattern

Refs: #<ticket-id>
```

---

## PHỤ LỤC — HOUSEKEEPING SONG SONG (chạy riêng, PR khác)

Phát hiện lỗi cần sửa: `wms-backend/CLAUDE.md` mục **11.4 Workspace Paths** đang ghi sai đường dẫn. Thay:

```diff
- Backend:  C:\Users\Admin\wms-backend\    (repo hiện tại)
- Frontend: C:\Users\Admin\wms-frontend\   (sibling directory)
+ Backend:  D:\SHERP\SHERP\wms-backend     (monorepo workspace)
+ Frontend: D:\SHERP\SHERP\wms-frontend    (monorepo workspace)
```

Cập nhật luôn mục 11.5 cho khớp:

```diff
- cd C:\Users\Admin\wms-backend && npm run build
- cd C:\Users\Admin\wms-frontend && npx tsc --noEmit
+ cd D:\SHERP\SHERP\wms-backend && npm run build
+ cd D:\SHERP\SHERP\wms-frontend && npx tsc --noEmit
```

Commit riêng: `docs(backend): fix wrong workspace paths in CLAUDE.md section 11`

---

**Bắt đầu thực thi. Nhớ DỪNG LẠI sau Bước 5 để đợi duyệt.**
