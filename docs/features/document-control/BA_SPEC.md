# BA_SPEC: Module Document Control — SH-GROUP ERP

> **Nguồn tham chiếu:** `docs/reference/docs/SDLC_DocumentControl_SHERP_v2.docx` (IMPC v2.0, 14/4/2026) — đã adapted cho stack thực tế SHERP
> **Feature:** Document Control — Quản lý Tài liệu Dự án (Version + Approval + Search + Audit)
> **Chuẩn tham chiếu:** ISO 9001 Document Control Clause 7.5, Oracle Fusion Document Management
> **Ngày phân tích:** 2026-04-14
> **Trạng thái:** Gate 1 — BA ANALYSIS

---

## 1. BỐI CẢNH NGHIỆP VỤ

Module `documents/` hiện tại đã hỗ trợ **Folder + File + Expiry tracking** cho dự án, nhưng **THIẾU** các nghiệp vụ trọng yếu theo chuẩn ISO 9001 Document Control:

- **Không có Version Control:** Khi tài liệu đổi mới (ví dụ: Bản vẽ thiết kế Rev.02), người dùng phải upload file mới, mất lịch sử phiên bản cũ.
- **Không có Approval Workflow:** Tài liệu quan trọng (Hợp đồng, Bản vẽ, Quy trình QC) được upload không qua duyệt → không có truy xuất trách nhiệm.
- **Không có Audit Trail:** Không ghi nhận "Ai đã xem/sửa/duyệt tài liệu nào, khi nào" → thất bại kiểm toán ISO.
- **Tìm kiếm kém:** Chỉ search theo tên file → không tìm được theo nội dung, tags, loại tài liệu.

Module Document Control v2.1 SHERP-Adapted sẽ giải quyết 4 gaps trên bằng cách **mở rộng** module `documents/` hiện có (không build mới) và **kết nối** với module `approvals/` (đã Done).

### 1.1 Phân loại tài liệu quản lý

| Nhóm | Ví dụ | Yêu cầu đặc biệt |
|---|---|---|
| **Pháp lý / Hợp đồng** | Hợp đồng CĐT, HĐ NCC, BBNT | Phê duyệt đa cấp + ký số (Wesign — Phase B) |
| **Kỹ thuật** | Bản vẽ thiết kế, BOQ, QC Plan | Version control chặt, rollback khi cần |
| **Chất lượng** | Quy trình ITP, Checklist NCR | Expiry tracking, phê duyệt trước khi áp dụng |
| **Báo cáo** | Báo cáo tiến độ, Biên bản họp | Full-text search, audit view |
| **Chứng chỉ** | ISO, CO, CQ, An toàn | Expiry alert (đã có), rollback version khi gia hạn |

---

## 2. USER STORIES

### US-DOC-01: Upload phiên bản mới (New Version)
> **As a** Project Member (PM/PD/Engineer),
> **I want to** upload phiên bản mới của một tài liệu đã tồn tại,
> **So that** hệ thống giữ nguyên lịch sử các phiên bản cũ và tôi có thể tham chiếu/khôi phục khi cần.

**Acceptance Criteria:**
- Chọn 1 `ProjectDocument` đã tồn tại → nút "Upload phiên bản mới"
- Upload file lên Cloudinary → hệ thống tạo record mới trong `document_versions`
- `version_number` tự động tăng (V1.0 → V1.1 → V1.2...)
- Bắt buộc nhập `change_note` (≥ 10 ký tự) — ghi rõ thay đổi gì
- Hệ thống tính `checksum` (SHA-256) để chống duplicate upload
- `current_version_id` trên `ProjectDocument` trỏ tới version mới nhất
- UI hiển thị badge `V1.2` trên tài liệu + tooltip "Cập nhật bởi X lúc Y"

**Business Rules:**
- **BR-DOC-01:** CẤM xóa version cũ — chỉ đánh dấu `is_archived = true` nếu cần
- **BR-DOC-02:** `change_note` BẮT BUỘC cho mọi version > 1.0
- **BR-DOC-03:** Nếu `checksum` trùng với version cũ bất kỳ → reject upload với thông báo "File không thay đổi"
- **BR-DOC-04:** Chỉ user có privilege `MANAGE_PROJECTS` hoặc là owner của document mới được upload version mới

### US-DOC-02: Xem lịch sử & Rollback version
> **As a** Project Manager,
> **I want to** xem toàn bộ lịch sử phiên bản của một tài liệu và khôi phục version cũ,
> **So that** khi version mới có lỗi tôi có thể rollback về bản đúng trước đó.

**Acceptance Criteria:**
- Trang Document Detail → tab "Lịch sử phiên bản"
- Hiển thị bảng: Version | Uploader | Ngày | Kích thước | Change note | Download | Rollback
- Nút "Rollback to this version" (chỉ hiện với privilege `MANAGE_PROJECTS`)
- Khi rollback: hệ thống KHÔNG xóa version hiện tại — tạo NEW version với `source_version_id` trỏ về version cũ + `change_note = "Rollback from V1.2 to V1.0"`
- Audit log ghi nhận hành động rollback

**Business Rules:**
- **BR-DOC-05:** Rollback tạo version mới, KHÔNG ghi đè — đảm bảo append-only history
- **BR-DOC-06:** Không được rollback nếu document đang ở trạng thái `PENDING_APPROVAL`

### US-DOC-03: Gửi tài liệu đi phê duyệt
> **As a** Document Owner,
> **I want to** gửi một version tài liệu đi phê duyệt theo workflow có sẵn,
> **So that** tài liệu được xác nhận hợp lệ trước khi sử dụng chính thức.

**Acceptance Criteria:**
- Chọn Document Version → nút "Gửi duyệt"
- Chọn `ApprovalConfig` phù hợp (đã cấu hình trong module `approvals/`)
- Hệ thống tạo `ApprovalRequest` liên kết với `DocumentVersion` qua bảng bridge `document_approval`
- Trạng thái document → `PENDING_APPROVAL`
- Các approver được notify (email — dùng SMTP hiện có)
- Khi tất cả approver PASS → document → `APPROVED` + `approved_version_id` cập nhật
- Nếu bị REJECT → document → `REJECTED` + comment hiển thị cho owner

**Business Rules:**
- **BR-DOC-07:** Một DocumentVersion chỉ có 1 ApprovalRequest active tại một thời điểm
- **BR-DOC-08:** Khi version đang `PENDING_APPROVAL` → CẤM upload version mới (phải đợi kết quả duyệt)
- **BR-DOC-09:** Trạng thái document map sang approvals enum: `PENDING` | `APPROVED` | `REJECTED` | `PENDING_INFO`
- **BR-DOC-10:** Tái sử dụng 100% module `approvals/` — không tạo bảng workflow mới

### US-DOC-04: Tìm kiếm tài liệu (Full-text Search)
> **As a** User (bất kỳ role),
> **I want to** tìm kiếm tài liệu theo nhiều tiêu chí (tên, nội dung, tags, loại),
> **So that** tôi tìm được đúng tài liệu cần thiết nhanh chóng.

**Acceptance Criteria:**
- Trang `Documents Search` với filter panel:
  - Keyword (tìm trong `document_name`, `notes`, `tags`, `change_note`)
  - Project (filter theo dự án)
  - Folder type (Hợp đồng / Kỹ thuật / Chất lượng...)
  - Status (VALID / EXPIRING / EXPIRED / PENDING / APPROVED)
  - Date range (`created_at`, `expiry_date`)
  - Uploader
- Response thời gian < 1 giây với 10,000 documents (dùng pg_trgm + GIN index)
- Kết quả hiển thị: Tên | Project | Version | Status | Uploader | Ngày | Relevance score
- Hỗ trợ tìm tiếng Việt có dấu + không dấu (unaccent extension)

**Business Rules:**
- **BR-DOC-11:** User chỉ thấy documents của các project mà họ có quyền truy cập (qua `project_assignments`)
- **BR-DOC-12:** Document đã soft-delete (`is_active=false` hoặc `deleted_at`) KHÔNG xuất hiện trong search

### US-DOC-05: Audit Trail
> **As a** Admin / Auditor,
> **I want to** xem lịch sử đầy đủ của một tài liệu (ai làm gì, khi nào),
> **So that** tôi có thể kiểm toán tuân thủ ISO 9001 và phát hiện hành vi bất thường.

**Acceptance Criteria:**
- Trang Document Detail → tab "Nhật ký hoạt động"
- Hiển thị timeline các events: `CREATED`, `UPLOADED_VERSION`, `VIEWED`, `DOWNLOADED`, `SUBMITTED_APPROVAL`, `APPROVED`, `REJECTED`, `ROLLBACK`, `ARCHIVED`
- Mỗi event có: Actor | Action | Timestamp | IP | User-Agent | Before/After snapshot (JSONB)
- Audit log là **IMMUTABLE**: chỉ INSERT, không có endpoint UPDATE/DELETE
- Export CSV cho audit report

**Business Rules:**
- **BR-DOC-13:** Audit log BẮT BUỘC cho 100% hành động write (upload, approve, rollback, archive)
- **BR-DOC-14:** Audit log write ASYNC (không block API response) — qua NestJS Interceptor
- **BR-DOC-15:** Retention 7 năm theo quy định kiểm toán doanh nghiệp

### US-DOC-06: Thông báo hết hạn (đã có, mở rộng)
> **Tính năng HIỆN CÓ** trong `documents/` — chỉ cần mở rộng:
- Thêm notification khi: version mới được approve, document bị rollback, approval bị reject
- Tái sử dụng `document_notifications` table hiện có

---

## 3. BUSINESS RULES TỔNG HỢP

| Mã | Luật | Module áp dụng |
|---|---|---|
| BR-DOC-01 | Append-only versioning — không xóa version cũ | Versions |
| BR-DOC-02 | Change note bắt buộc với v > 1.0 | Versions |
| BR-DOC-03 | Reject duplicate checksum | Versions |
| BR-DOC-04 | Quyền upload = MANAGE_PROJECTS hoặc owner | Versions |
| BR-DOC-05 | Rollback = tạo version mới (không ghi đè) | Versions |
| BR-DOC-06 | Cấm rollback khi đang PENDING_APPROVAL | Versions ↔ Approvals |
| BR-DOC-07 | 1 version = 1 approval request active | Versions ↔ Approvals |
| BR-DOC-08 | Cấm upload version khi đang PENDING_APPROVAL | Versions ↔ Approvals |
| BR-DOC-09 | Tái sử dụng enum `approvals.enum.ts` | Approvals |
| BR-DOC-10 | Không tạo workflow engine mới | Approvals |
| BR-DOC-11 | Filter theo quyền truy cập project | Search |
| BR-DOC-12 | Soft-delete ẩn khỏi search | Search |
| BR-DOC-13 | Audit 100% hành động write | Audit |
| BR-DOC-14 | Audit async, không block API | Audit |
| BR-DOC-15 | Retention 7 năm | Audit |

---

## 4. KPIs & REPORT FIELDS

### 4.1 Document Control Dashboard

| KPI | Công thức | Nguồn dữ liệu |
|---|---|---|
| **Tổng số tài liệu** | `COUNT(project_documents WHERE is_active)` | `project_documents` |
| **Documents chờ duyệt** | `COUNT WHERE status = 'PENDING_APPROVAL'` | `project_documents` + `approval_requests` |
| **Tỷ lệ duyệt đúng hạn** | `APPROVED_ON_TIME / TOTAL_APPROVED` | `approval_requests.created_at` vs `completed_at` |
| **Documents hết hạn 30 ngày** | `COUNT WHERE expiry_date <= NOW() + 30d` | `project_documents` (đã có) |
| **Trung bình version/document** | `AVG(COUNT(versions) GROUP BY document)` | `document_versions` |
| **Active users (30d)** | `COUNT(DISTINCT actor_id) FROM audit WHERE created_at >= NOW() - 30d` | `document_audit_logs` |
| **Documents chưa có phiên bản approved** | `COUNT WHERE approved_version_id IS NULL` | `project_documents` |

### 4.2 Per-Project Report

- Tài liệu theo folder (đã có)
- Tài liệu chưa duyệt > 7 ngày (escalation alert)
- Version churn rate (số version/tháng)
- Top 10 uploaders

---

## 5. ẢNH HƯỞNG TÀI CHÍNH & TUÂN THỦ

### 5.1 Financial Impact (theo rule BA)
- **KHÔNG ảnh hưởng trực tiếp** tới hạch toán Nợ/Có — module này không ghi sổ GL
- **GIÁN TIẾP ảnh hưởng** Budgetary Control:
  - Hợp đồng NCC phải có Document version APPROVED mới cho phép tạo PO (BR-09 future)
  - BBNT (Biên bản nghiệm thu) là trigger cho AP Invoice → cần link với Finance module khi có
- Không gọi `BudgetService.checkBudgetLimit()` trong module này (không phát sinh transaction tài chính)

### 5.2 Compliance Impact
- **ISO 9001 Clause 7.5** Documented Information: SHERP cần Version + Approval + Retention → module này đáp ứng
- **IFRS Audit Trail**: Audit log 7 năm đảm bảo truy xuất nguồn gốc chứng từ
- **Luật Kế toán VN 2015 Điều 41**: Chứng từ điện tử phải có chữ ký điện tử → Wesign Phase B

---

## 6. OUT OF SCOPE (Phase A MVP)

Các tính năng KHÔNG nằm trong scope MVP 4-sprint:

| Tính năng | Lý do loại | Phase |
|---|---|---|
| Wesign/MISA e-signature | Phụ thuộc tài khoản MISA AMISApp — IMPC chưa xác nhận | Phase B |
| Bull Queue + Upstash Redis | Volume hiện tại < 100 doc/ngày — chưa cần async | Phase B khi scale |
| Cloudflare R2 migration | Cloudinary đã hoạt động tốt cho MVP | KHÔNG — giữ Cloudinary |
| Mobile 20MB limit | SHERP chưa có mobile app | Phase B |
| Excel export dashboard | Có thể dùng CSV export trước | Phase B |
| Virus scan upload | Cloudinary có quét sẵn (limited) | Phase B nếu cần ClamAV |

---

## 7. CHECKLIST HOÀN THÀNH GATE 1

- [x] User Stories đã liệt kê đầy đủ (6 stories, priority MVP)
- [x] Business Rules rõ ràng (15 BRs, mapping với module)
- [x] KPI fields được xác định (7 KPIs dashboard + per-project report)
- [x] Ảnh hưởng đến Financials đã đánh giá (indirect only)
- [x] Out of scope rõ ràng (6 items dời sang Phase B)
- [x] Tham chiếu tới module hiện có (`documents/`, `approvals/`) — không duplicate

---

## 8. TÍCH HỢP KÝ SỐ (E-SIGNATURE INTEGRATION)

> **Nguyên tắc triển khai:** Tách **2 giai đoạn độc lập tuần tự**. Phase A (Duyệt nội bộ) BẮT BUỘC hoàn thành, nghiệm thu và vận hành ổn định trước khi mở Phase B (Ký số ngoại qua Wesign). **Không gộp 2 phase chung 1 sprint.**

### 8.1 Phase A — Duyệt nội bộ (MVP — LÀM TRƯỚC)

**Mục tiêu:** Người phê duyệt trong SHERP xác nhận/từ chối tài liệu để chuyển trạng thái document từ `PENDING_APPROVAL` → `APPROVED` | `REJECTED`. Dấu duyệt là **internal approval stamp** (không có giá trị pháp lý chữ ký số).

**Tái sử dụng:** Module `approvals/` đã DONE (Sprint 4) — workflow engine + steps + notifications.

**Luồng nghiệp vụ:**
1. Uploader submit `document_version` → chọn `workflow_id` phù hợp với `doc_type`
2. Hệ thống tạo `approval_request` + N `approval_steps` theo thứ tự workflow
3. Approver step 1 nhận notification → mở `SubmitApprovalDialog` → xem preview file → click **Approve** hoặc **Reject** (+ lý do bắt buộc)
4. Hệ thống ghi `audit_log` (actor_id, action, old_status, new_status, timestamp, IP) — INSERT-only, immutable
5. Tất cả step APPROVE → `ProjectDocument.status = APPROVED`, `approved_at = now()`, `approved_by = final approver`
6. Bất kỳ step nào REJECT → `status = REJECTED`, document quay về `DRAFT` cho uploader sửa/upload version mới

**Scope Phase A (TRONG MVP):**
- Duyệt tuần tự đa cấp (step_order 1 → 2 → N)
- Duyệt song song cùng cấp (quorum ≥ X% approvers trong cùng step)
- In-app notification (email dời Phase B)
- Audit timeline đầy đủ (hiển thị qua `AuditTimelineDialog`)
- Rollback trạng thái khi reject (không ảnh hưởng version cũ đã APPROVED)

**Definition of Done — Phase A:**
- [ ] 100% test `approval.workflow.service` PASS (unit + integration)
- [ ] UI `SubmitApprovalDialog` + reject với lý do hoạt động end-to-end
- [ ] Audit log hiển thị đầy đủ trong `AuditTimelineDialog` (actor, action, delta, timestamp)
- [ ] UAT pass với 2 use case thực: duyệt Hợp đồng NCC + duyệt Bản vẽ thiết kế
- [ ] Performance: duyệt 1 tài liệu < 1s response, audit query < 500ms

---

### 8.2 Phase B — Tích hợp Wesign (MISA AMISApp) — GIAI ĐOẠN SAU

**Mục tiêu:** Sau khi tài liệu đã APPROVED nội bộ (Phase A), tài liệu pháp lý (Hợp đồng CĐT, HĐ NCC, Biên bản nghiệm thu) cần chữ ký số có giá trị pháp lý → gọi Wesign API tạo signing request.

#### Pre-requisites — KHÔNG bắt đầu Phase B nếu chưa đủ:
- [ ] Phase A đã nghiệm thu PASS + vận hành ít nhất 1 tháng ổn định
- [ ] IMPC cấp tài khoản MISA AMISApp + API key + `wesign_webhook_secret`
- [ ] Gate 2 SA_DESIGN riêng cho Phase B (webhook, Bull Queue, HMAC verify, cron fallback)
- [ ] Upstash Redis + Render Background Worker đã provisioned và test
- [ ] Legal team confirm đúng chuẩn Luật Giao dịch Điện tử VN (Nghị định 130/2018/NĐ-CP)
- [ ] Resend/SendGrid đã setup + verified sender domain

#### Luồng nghiệp vụ đề xuất (chi tiết ở Phase B SA_DESIGN):
1. Document đã APPROVED nội bộ (Phase A hoàn tất) → xuất hiện nút **"Gửi ký số"** (chỉ cho `doc_type` cần chữ ký số)
2. Frontend `POST /documents/:id/wesign` → NestJS API enqueue Bull job `wesign.create_request`
3. Background Worker consume job → call Wesign API → nhận `wesign_request_id` + `signing_url` cho từng ký viên
4. Worker gửi email (Resend) + in-app notification kèm signing_url tới ký viên theo thứ tự
5. Ký viên ký trên MISA AMISApp → Wesign webhook `POST /webhooks/wesign`
6. API verify HMAC-SHA256 signature (reject nếu invalid) → enqueue job `wesign.update_status`
7. Worker update `approval_steps.signed_at`, tải file đã ký từ Wesign → lưu Cloudinary/R2
8. Cron fallback (`@Cron('*/15 * * * *')`) check các `wesign_request` pending > 1h → call Wesign GET status để đồng bộ

#### Scope Phase B:
- Wesign sequential signing (theo `step_order`)
- Webhook idempotency (same `wesign_request_id` + event → skip xử lý lại)
- Cron polling fallback (defense-in-depth khi webhook fail)
- Email transactional notification (Resend)
- Download file đã ký về storage nội bộ (không phụ thuộc Wesign lâu dài)

#### OUT of Phase B (dời Phase C):
- Ký số qua CA cloud khác ngoài Wesign (VNPT-CA, Viettel-CA, FPT-CA)
- Ký hàng loạt (batch signing nhiều document cùng lúc)
- Ký trên mobile app (dời theo lộ trình mobile app)
- Ký nội bộ SHERP + chữ ký hình ảnh (handwritten signature) — KHÔNG làm

#### Gate điều kiện kích hoạt Phase B:
> Chỉ bắt đầu Phase B khi **Product Owner + CTO + Legal** cùng ký vào **Gate Transition Document** xác nhận:
> 1. Phase A PASS 100% acceptance criteria
> 2. Toàn bộ pre-requisites (section 8.2) đã đáp ứng
> 3. Budget + timeline Phase B được phê duyệt trong Steering Committee

---

### 8.3 Ma trận trạng thái document cross-phase

| Trạng thái | Phase A | Phase B | Mô tả |
|---|---|---|---|
| `DRAFT` | ✅ | ✅ | Uploader đang soạn, chưa gửi duyệt |
| `PENDING_APPROVAL` | ✅ | ✅ | Đã gửi duyệt nội bộ, chờ approvers |
| `APPROVED` | ✅ | ✅ | Duyệt nội bộ xong (điểm dừng cuối của Phase A) |
| `REJECTED` | ✅ | ✅ | Bị reject nội bộ, quay về DRAFT |
| `PENDING_SIGNATURE` | ❌ | ✅ | Đã APPROVED, đang chờ ký số ngoài |
| `SIGNED` | ❌ | ✅ | Hoàn tất ký số qua Wesign |
| `SIGN_FAILED` | ❌ | ✅ | Ký số thất bại (ký viên reject/timeout) |

**Lưu ý BC:** Phase A chỉ làm việc với 4 trạng thái đầu. Không hard-code enum cho 3 trạng thái Phase B — dời vào migration Phase B để tránh pollute schema hiện tại.

---

**Next Gate:** Gate 2 — SA_DESIGN (Entity + ERD + API + Clean Architecture folder). **Phase A** SA_DESIGN đã DONE. **Phase B** SA_DESIGN chưa bắt đầu — mở task khi đủ pre-requisites.
