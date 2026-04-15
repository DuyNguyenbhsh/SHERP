# DEPLOY_CHECKLIST: Document Control v2.1

> **Feature:** Document Control (Version + Approval + Search + Audit)
> **Gate:** 5 — DevOps & Deploy
> **Tham chiếu:** `BA_SPEC.md`, `SA_DESIGN.md`, `TEST_REPORT.md`
> **Migrations mới:** 2 files
> **Env vars mới:** 0
> **Ngày soạn:** 2026-04-14

---

## 1. ⚠️ PRE-DEPLOY SAFETY CHECK

### 1.1 Quy tắc vàng (deploy-rules.md)

> **"Dừng triển khai! Database Migration có nguy cơ làm mất dữ liệu của dự án hiện hữu."**

→ Trước khi chạy trên PRODUCTION, **BẮT BUỘC** test qua Neon dev branch trước. Không chạy trực tiếp lên main DB.

### 1.2 Backup trước migration

```bash
# Neon: tạo branch backup từ main trước khi migrate
neonctl branches create --name backup-pre-doc-control-v21 --parent main

# Hoặc pg_dump nếu dùng Postgres self-hosted
pg_dump $DATABASE_URL > backup_pre_doccontrol_$(date +%Y%m%d_%H%M).sql
```

### 1.3 Audit dữ liệu hiện có (bảng bị ảnh hưởng)

```sql
-- Đếm documents hiện có (sẽ được backfill V1.0)
SELECT COUNT(*) AS total_documents,
       COUNT(file_url) AS with_file_url,
       COUNT(*) FILTER (WHERE status = 'VALID') AS valid,
       COUNT(*) FILTER (WHERE status = 'EXPIRING_SOON') AS expiring,
       COUNT(*) FILTER (WHERE status = 'EXPIRED') AS expired
FROM project_documents;

-- Ghi lại kết quả để đối chiếu SAU migration
```

---

## 2. MIGRATIONS

### 2.1 Danh sách migrations mới (theo thứ tự)

| # | File | Mô tả | Rủi ro |
|---|---|---|---|
| 1 | `1776000000000-DocumentControlV21Sprint1.ts` | Tạo `document_versions`, extend `project_documents`, backfill V1.0 | **MEDIUM** — data backfill |
| 2 | `1776000000001-DocumentControlV21Sprint4.ts` | Enable `pg_trgm` + `unaccent`, thêm `search_vector` generated column, tạo `document_audit_logs` | **LOW-MEDIUM** — cần quyền CREATE EXTENSION |

### 2.2 Pre-flight: Quyền PostgreSQL cho extensions

Migration 2 chạy:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
```

**Neon DB:** 2 extensions này nằm trong whitelist của Neon → chạy trực tiếp OK với user thường.
Tham khảo: [Neon — Supported Extensions](https://neon.tech/docs/extensions/pg-available-extensions).

**Self-hosted PostgreSQL:** Cần user có quyền `SUPERUSER` hoặc `rds_superuser` (AWS RDS).

→ **Verify trước:** chạy thử trên Neon dev branch:
```sql
\dx pg_trgm
\dx unaccent
```

### 2.3 Run migration

```bash
cd wms-backend
export DATABASE_URL="<neon-dev-branch-url>"
npm run migration:run
```

**Kỳ vọng output:**
```
Migration DocumentControlV21Sprint11776000000000 has been executed successfully.
Migration DocumentControlV21Sprint41776000000001 has been executed successfully.
```

### 2.4 POST-MIGRATION — Verify toàn vẹn dữ liệu

```sql
-- [1] Số document_versions = số project_documents có file_url
SELECT
  (SELECT COUNT(*) FROM project_documents WHERE file_url IS NOT NULL AND file_url <> '') AS docs_with_file,
  (SELECT COUNT(*) FROM document_versions WHERE version_seq = 1) AS v1_created;
-- Kỳ vọng: 2 giá trị = nhau

-- [2] Mỗi document có file_url đều có current_version_id trỏ về V1.0
SELECT COUNT(*) FROM project_documents
WHERE file_url IS NOT NULL AND file_url <> ''
  AND current_version_id IS NULL;
-- Kỳ vọng: 0

-- [3] search_vector tồn tại cho tất cả rows
SELECT COUNT(*) FROM project_documents WHERE search_vector IS NULL;
-- Kỳ vọng: 0 (generated always)

-- [4] Extensions đã cài
SELECT extname FROM pg_extension WHERE extname IN ('pg_trgm', 'unaccent');
-- Kỳ vọng: 2 rows

-- [5] Function f_unaccent tồn tại
SELECT proname FROM pg_proc WHERE proname = 'f_unaccent';
-- Kỳ vọng: 1 row

-- [6] Indexes đã tạo
SELECT indexname FROM pg_indexes
WHERE tablename IN ('document_versions', 'document_audit_logs', 'project_documents')
  AND indexname LIKE 'IDX_%' OR indexname LIKE 'UQ_%';
-- Kỳ vọng: ≥ 7 indexes mới (DOCVER_CHECKSUM, DOCVER_DOCUMENT, UQ_DOCVER_SEQ,
--          DOCS_SEARCH, DOCS_TAGS_GIN, DOCAUDIT_ENTITY, DOCAUDIT_ACTOR, DOCAUDIT_CREATED_AT)

-- [7] Enum status có thể chứa giá trị mới
UPDATE project_documents SET status = 'DRAFT' WHERE id = (SELECT id FROM project_documents LIMIT 1);
-- Sau đó rollback transaction
```

### 2.5 Rollback plan (nếu có sự cố)

```bash
# Revert 2 migrations gần nhất (Sprint 4 trước, Sprint 1 sau)
npm run migration:revert  # undo Sprint 4
npm run migration:revert  # undo Sprint 1
```

**Lưu ý:**
- File đã upload Cloudinary ở bước test **KHÔNG** bị xóa khi revert DB. Phải xóa thủ công qua Cloudinary dashboard nếu cần sạch 100%.
- Revert Sprint 1 xóa `document_versions` table → các version đã tạo trong giai đoạn test sẽ mất.
- Không ảnh hưởng `project_documents` gốc — chỉ drop columns mới thêm.

---

## 3. ENV VARIABLES

### 3.1 ✅ Không có env vars mới

Document Control v2.1 **TÁI SỬ DỤNG** env vars đã có:
- `DATABASE_URL` — Neon connection (đã có)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — Upload file (đã có)
- `JWT_SECRET` — Auth (đã có)
- `ALLOWED_ORIGINS` — CORS (đã có)

→ **Không cần cập nhật `.env` trên Render/Vercel.**

### 3.2 Verify env trên hosting

**Render (Backend):**
```bash
# Dashboard → sherp-api → Environment → kiểm tra đủ
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
DATABASE_URL  # pooled connection (PgBouncer)
```

**Vercel (Frontend):** không cần env vars mới.

---

## 4. PRIVILEGE SEEDING

### 4.1 Seed service auto-chạy khi boot

`SeedService.onModuleInit()` sẽ tự thêm privilege mới `VIEW_AUDIT` (module=DOCUMENT) và gán vào `SUPER_ADMIN` role nếu role đó đã tồn tại.

### 4.2 Verify sau deploy

```sql
SELECT privilege_code, privilege_name, module
FROM privileges
WHERE privilege_code = 'VIEW_AUDIT';
-- Kỳ vọng: 1 row, module = 'DOCUMENT'

SELECT r.role_code, p.privilege_code
FROM roles r
JOIN role_privileges rp ON rp.role_id = r.id
JOIN privileges p ON p.id = rp.privilege_id
WHERE p.privilege_code = 'VIEW_AUDIT';
-- Kỳ vọng: ít nhất 1 row với role SUPER_ADMIN
```

### 4.3 Gán privilege cho các role khác

Nếu muốn role `PROJECT_MANAGER` cũng được xem audit → gán thủ công qua UI `/system/roles`.

---

## 5. DEPLOY STEPS

### 5.1 Staging (Neon dev branch + Render preview)

```bash
# [1] Push branch
git add docs/features/document-control wms-backend/src/documents wms-backend/src/migrations wms-backend/src/approvals/enums wms-backend/src/seed wms-frontend/src/entities/document wms-frontend/src/features/document wms-frontend/src/pages/DocumentSearchPage.tsx wms-frontend/src/pages/projects/ProjectDocumentsPage.tsx wms-frontend/src/routes/index.tsx wms-frontend/src/shared/components/layout/Sidebar.tsx wms-frontend/src/features/role/ui/PermissionMatrixDialog.tsx wms-frontend/src/pages/WorkflowConfigPage.tsx wms-frontend/src/pages/project-requests/ProjectRequestsPage.tsx wms-frontend/src/pages/projects/ProjectDetailPage.tsx
git commit -m "feat(document-control): version + approval + search + audit (v2.1)"
git push origin feature/document-control-v21

# [2] Mở PR → review → merge vào staging branch

# [3] Render auto-deploy staging
# [4] Vercel auto-deploy preview/staging

# [5] Chạy migration trên staging DB
cd wms-backend && DATABASE_URL="<staging-url>" npm run migration:run
```

### 5.2 Smoke test Staging (theo TEST_REPORT §3.3)

14 bước đã liệt kê trong `TEST_REPORT.md §3.3`. Chạy xong đánh dấu PASS vào TEST_REPORT.

### 5.3 Production (Tag release)

```bash
git tag v2.1-document-control
git push origin v2.1-document-control

# Render Production deploy — manual approval
# Migration chạy tự động qua render.yaml startCommand
```

---

## 6. HEALTH CHECKS (POST-DEPLOY)

### 6.1 Connection Error Test

```bash
# API health
curl https://<backend-url>/health
# Kỳ vọng: { status: 'ok', db: 'connected' }

# Upload version (auth needed — dùng Postman với JWT)
POST https://<backend-url>/documents/:documentId/versions
  Headers: Authorization: Bearer <token>
  Form: file=@test.pdf, change_note="Test deploy V2.1"
# Kỳ vọng: 201 + version_number="V1.1" (hoặc tăng tiếp)
```

### 6.2 Routing Fallback Test

```bash
# Frontend routes mới
https://<frontend-url>/documents/search  # Trang search
# Kỳ vọng: trang load + filter panel render

# Refresh browser trên trang này → verify SPA fallback không 404
```

### 6.3 Full-text Search Test

```bash
GET https://<backend-url>/documents/search?keyword=hop%20dong&limit=20
# Kỳ vọng: response < 1s, items match keyword (có/không dấu đều OK nhờ unaccent)
```

### 6.4 Audit Log Test

```bash
GET https://<backend-url>/documents/:documentId/audit-logs
  Headers: Authorization: Bearer <token-with-VIEW_AUDIT>
# Kỳ vọng: 200 + array các events (UPLOADED_VERSION, SUBMITTED_APPROVAL, ...)
```

---

## 7. MONITORING SAU DEPLOY

### 7.1 Metrics cần theo dõi (24h đầu)

| Metric | Ngưỡng cảnh báo | Hành động |
|---|---|---|
| API error rate /documents/* | > 2% | Rollback + check Sentry |
| Upload latency (Cloudinary) | p95 > 10s | Check Cloudinary status + network |
| Search query latency | p95 > 2s | Check GIN index vacuum |
| DB connection pool | > 80% | Scale up connections |
| Audit log write failures | > 0 | Check DocumentAuditService logger |

### 7.2 Log patterns to watch

```
grep -i "Audit log thất bại" <logs>
grep -i "BR-DOC-" <logs>  # Conflict/business rule errors
grep -i "Checksum" <logs>
grep -i "pg_trgm\|unaccent" <logs>
```

---

## 8. KNOWN LIMITATIONS (chấp nhận trong MVP)

| Vấn đề | Ảnh hưởng | Phase B plan |
|---|---|---|
| Không có Bull Queue | Approval notification gửi đồng bộ trong request | Add Upstash Redis + Bull |
| Không có Wesign e-signature | Chưa có chữ ký số theo Luật KT VN 2015 Điều 41 | Integrate MISA Wesign |
| Audit log dùng setImmediate (local) | Log mất nếu instance crash trước khi flush | Dùng Bull Queue persist |
| Cloudinary 50MB limit | File lớn hơn 50MB reject | Dùng R2 multipart upload khi cần |
| Chưa có Excel export audit | Audit chỉ xem trên UI | Dùng `exceljs` existing service |

---

## 9. DEPLOY SIGNOFF CHECKLIST

### 9.1 Pre-Deploy (Duy + DevOps)
- [ ] Backup Neon main branch (snapshot hoặc branch copy)
- [ ] Audit dữ liệu trước migration — ghi lại số `project_documents` + `file_url`
- [ ] Review 2 migration files (`1776000000000` + `1776000000001`)
- [ ] Test migration trên **Neon dev branch** trước — verify §2.4 PASS
- [ ] Env vars trên Render/Vercel đã đủ (§3.2)

### 9.2 Post-Deploy
- [ ] Migration:run thành công trên production
- [ ] Verify §2.4 (7 queries) PASS trên production
- [ ] Verify §4.2 (privilege VIEW_AUDIT) PASS
- [ ] Connection Error Test (§6.1) PASS
- [ ] Routing Fallback Test (§6.2) PASS
- [ ] Full-text Search Test (§6.3) PASS
- [ ] Audit Log Test (§6.4) PASS
- [ ] Dữ liệu cũ `project_documents` còn nguyên (COUNT trước = COUNT sau)
- [ ] Docker containers healthy trên Render
- [ ] Sentry không có error spike bất thường sau 24h
- [ ] Cập nhật `TEST_REPORT.md` với kết quả smoke test

### 9.3 Rollback trigger (tự động dừng deploy)
- API error rate > 10% trong 5 phút
- Migration failed → revert ngay
- Dữ liệu `project_documents` giảm số lượng (data loss) → revert + restore backup

---

## 10. RÀ SOÁT TÀI LIỆU

- [x] Migrations đã commit vào Git
- [x] `.env.example` — không cần update (không có env mới)
- [x] `CLAUDE.md` Migration History — nên update thêm 2 dòng:
  ```
  | 32 | DocumentControlV21Sprint1 | Tạo document_versions + extend project_documents |
  | 33 | DocumentControlV21Sprint4 | pg_trgm + unaccent + search_vector + audit_logs |
  ```
- [x] Swagger `/docs` auto-cập nhật (NestJS runtime)
- [x] Frontend build artifact đã test local
- [ ] README.md — có thể thêm section Document Control features (optional)

---

**Deploy Signoff:**
> "Gate 5 chỉ PASS khi tất cả mục §9.1 + §9.2 ✅. Nếu bất kỳ item §9.3 trigger → dừng deploy + rollback."

**Next:** Merge vào main → tag release → deploy production → monitor 24h.
