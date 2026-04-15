# MANUAL VERIFICATION GUIDE — Document Control v2.1

> Hướng dẫn từng bước để Duy hoàn tất manual verification cho Gate 4 + Gate 5.
> Tất cả bước có script tự động — chỉ chạy lệnh là xong.

---

## BƯỚC 1 — Setup `.env` (nếu chưa có)

### 1.1 Backend env

```bash
cp wms-backend/.env.example wms-backend/.env
```

Mở `wms-backend/.env` và điền tối thiểu:

```env
DATABASE_URL=<Neon pooled connection URL — từ Neon dashboard, branch dev>
JWT_SECRET=<32+ ký tự random — chạy: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

# Cloudinary (đã có sẵn nếu đang dùng các feature upload khác)
CLOUDINARY_CLOUD_NAME=<từ Cloudinary dashboard>
CLOUDINARY_API_KEY=<...>
CLOUDINARY_API_SECRET=<...>

ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:5175
FRONTEND_URL=http://localhost:5174
```

### 1.2 Frontend env

```bash
cp wms-frontend/.env.example wms-frontend/.env.local
```

`wms-frontend/.env.local`:
```env
VITE_API_URL=http://localhost:3000/api
```

---

## BƯỚC 2 — Chạy migration

### 2.1 Build backend (phát hiện sớm lỗi TypeScript)

```bash
cd wms-backend
npm install   # nếu chưa
npm run build
```

### 2.2 Chạy migration

```bash
cd wms-backend
npm run migration:run
```

**Kỳ vọng output:**
```
Migration DocumentControlV21Sprint11776000000000 has been executed successfully.
Migration DocumentControlV21Sprint41776000000001 has been executed successfully.
```

### 2.3 Nếu migration FAIL

Xem log, rollback migration gần nhất và fix:
```bash
npm run migration:revert
```

Lỗi thường gặp:
- `permission denied for CREATE EXTENSION` → Duy đang dùng DB không phải Neon; cần quyền superuser
- `column "status" cannot be cast to varchar(30)` → có row đang dùng enum cũ ngoài whitelist — cần kiểm tra data
- `foreign key violation` → không xảy ra với migration này (chỉ ADD COLUMN + CREATE TABLE)

---

## BƯỚC 3 — Verify DB state (AUTO)

### 3.1 Chạy verification (không cần install gì thêm)

```bash
cd D:/SHERP/SHERP
node scripts/verify-document-control.mjs
```

> Script tự dùng `pg` + `dotenv` từ `wms-backend/node_modules` — không cần install dependencies.

**Kỳ vọng:**
```
✅ [1] Số document_versions V1.0 = số project_documents có file_url
✅ [2] Mỗi document có file_url đều có current_version_id
✅ [3] search_vector không null cho mọi row
✅ [4] Extensions pg_trgm + unaccent đã cài
✅ [5] Function f_unaccent tồn tại
✅ [6] Indexes mới đã tạo (≥ 7)
⚠️  [7] Privilege VIEW_AUDIT đã seed — NOT FOUND nếu chưa chạy backend
⚠️  [8] SUPER_ADMIN có privilege VIEW_AUDIT — chưa gán
✅ [9] document_audit_logs có BRIN index trên created_at

Kết quả: 7/9 PASS · 2 FAIL (bình thường — seed chạy sau khi boot backend)
```

**Note:** Check #7, #8 sẽ FAIL nếu chưa chạy backend lần nào. Chuyển sang Bước 4 để start backend → privilege sẽ tự seed.

---

## BƯỚC 4 — Khởi động Backend + Frontend

### 4.1 Terminal 1 — Backend

```bash
cd wms-backend
npm run start:dev
```

**Kỳ vọng log:**
```
🚀 SH-GROUP WMS/ERP Backend running on http://localhost:3000
📖 API Docs: http://localhost:3000/docs
✅ Đã thêm X quyền mới vào hệ thống.   ← SeedService chạy, thêm VIEW_AUDIT
```

### 4.2 Terminal 2 — Frontend

```bash
cd wms-frontend
npm install   # nếu chưa
npm run dev
```

Mở browser: `http://localhost:5173` (hoặc port Vite assign).

### 4.3 Chạy lại verify để confirm seed

```bash
cd D:/SHERP/SHERP
node scripts/verify-document-control.mjs
```

Bây giờ phải 9/9 PASS.

---

## BƯỚC 5 — Smoke test API (AUTO)

### 5.1 Lấy documentId để test

- Login UI bằng admin/admin123
- Vào 1 project → tab tài liệu → mở DevTools → Network
- Copy 1 documentId từ URL response

Hoặc query DB:
```sql
SELECT id, document_name FROM project_documents LIMIT 5;
```

### 5.2 Chạy smoke test API

```bash
cd D:/SHERP/SHERP
node scripts/smoke-test-document-control.mjs \
  --api http://localhost:3000/api \
  --user admin \
  --pass admin123 \
  --document <paste-document-id-here>
```

**Kỳ vọng:** ~10/10 bước PASS (Bước 8 sẽ warn nếu chưa có ApprovalConfig cho DOCUMENT_VERSION — bình thường).

---

## BƯỚC 6 — E2E UI Smoke Test (Manual Browser)

Theo `TEST_REPORT.md §3.3`, 14 bước browser:

### 6.1 Upload flows
1. Login → `/projects/:id/documents`
2. Chọn 1 document chưa có file → **Dropdown → Upload phiên bản mới** → upload PDF test → verify badge `V1.0` hiện
3. Upload lại cùng file → toast error "File không thay đổi"
4. Upload file khác với change_note < 10 ký tự → toast error

### 6.2 Version history
5. **Dropdown → Lịch sử phiên bản** → verify table hiện V1.0 + V1.1
6. Nút rollback ở row V1.0 → nhập lý do → confirm → tạo V1.2

### 6.3 Approval workflow
7. Vào `/system/workflow-config` → tạo `ApprovalConfig` mới:
   - entity_type = `DOCUMENT_VERSION`
   - Step 1: role `SUPER_ADMIN`, required_count = 1
8. Quay lại tài liệu → **Dropdown → Gửi phê duyệt** → verify status chuyển `PENDING_APPROVAL` (badge cam)
9. Thử **Upload phiên bản mới** khi đang PENDING → toast error "đang chờ duyệt"
10. Vào `/approvals` → approve request vừa tạo → quay lại document → verify status chuyển `APPROVED` (badge xanh)

### 6.4 Search
11. Sidebar → **Tìm kiếm Tài liệu** → gõ tên document (có dấu) → verify result
12. Gõ không dấu (ví dụ `hop dong` thay vì `hợp đồng`) → verify cũng match

### 6.5 Audit
13. **Dropdown → Nhật ký** → verify timeline hiện: UPLOADED_VERSION × 3, ROLLBACK, SUBMITTED_APPROVAL, APPROVED
14. Logout, login bằng user không có VIEW_AUDIT → verify **Dropdown → Nhật ký** trả 403 + UI show error banner

---

## BƯỚC 7 — Update TEST_REPORT.md

Sau khi hoàn tất Bước 3 + 5 + 6, update `docs/features/document-control/TEST_REPORT.md`:

```markdown
### Gate 4 — TEST Signoff

- [x] Database State Verification ✅ — chạy `verify-document-control.mjs` 9/9 PASS
- [x] E2E Smoke Test ✅ — 14/14 bước browser pass
- [x] Automated smoke API ✅ — `smoke-test-document-control.mjs` PASS
```

---

## TROUBLESHOOTING

### "pg not found" / "Cannot find module 'pg'"
Script dùng `pg` từ `wms-backend/node_modules`. Cài backend deps trước:
```bash
cd wms-backend && npm install
```

### Migration lỗi "search_vector already exists"
Migration 2 đã chạy rồi. Check qua:
```bash
node scripts/verify-document-control.mjs
```

### Backend không start — EADDRINUSE 3000
Skill 6 (AUTO-PORT-CHECK) phải tự kill. Nếu không:
```bash
cd wms-backend && bash scripts/kill-port.sh 3000
npm run start:dev
```

### "Chưa cấu hình workflow cho DOCUMENT_VERSION"
Đây là expected — cần tạo ApprovalConfig qua UI trước (Bước 6 bước 7).

### Frontend không thấy privilege VIEW_AUDIT
Logout + login lại để refresh JWT payload (privileges được embed vào token lúc login).

---

## SIGNOFF

Khi tất cả BƯỚC 2-6 ✅ PASS:
1. Update `TEST_REPORT.md` tick thêm 2 checkbox
2. Tiếp `DEPLOY_CHECKLIST.md` Gate 5 cho production

Duy đang stuck ở bước nào — paste error ra tôi debug.
