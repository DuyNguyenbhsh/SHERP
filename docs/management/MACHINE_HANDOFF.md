# SH-GROUP ERP — Bàn Giao Giữa Các Máy

> **Mục đích:** File tổng hợp giúp Duy mở project trên máy mới và kiểm tra toàn bộ hệ thống hoạt động đúng trạng thái máy cũ.
> **Ngày lập:** 2026-04-11
> **Commit HEAD:** `5196ebd` — fix(upload): set type=upload + access_mode=public for Cloudinary
> **Branch:** `main` (sạch, đã đồng bộ với `origin/main`)

---

## 1. Quy trình khởi động máy mới (checklist nhanh)

```bash
# 1. Clone
git clone <repo-url> "SH ERP"
cd "SH ERP"

# 2. Cài dependencies (workspaces: backend + frontend)
npm install

# 3. Tạo file env
cp wms-backend/.env.example wms-backend/.env
# Sau đó điền giá trị thật (xem mục 3 bên dưới)

# 4. Khởi động an toàn (có pre-flight check + auto kill port 3000)
npm run start-safe
```

**Bắt buộc dùng `npm run start-safe`** (không chạy `npm run dev` trực tiếp) — lệnh này chạy `scripts/pre-flight-check.mjs` để verify env, DB, port trước khi bật NestJS + Vite.

---

## 2. Kiến trúc tổng quan

```
Browser --> Frontend (Vite React, port 5174)
         --> Backend API (NestJS, port 3000)
         --> Neon PostgreSQL (cloud)
         --> Cloudinary (file storage)
```

| Tầng | Tech | Thư mục |
|------|------|---------|
| Frontend | React 18 + Vite + TailwindCSS | `wms-frontend/` |
| Backend | NestJS + TypeORM | `wms-backend/` |
| Database | PostgreSQL (Neon) | — |
| File storage | Cloudinary | `wms-backend/src/shared/cloud-storage.service.ts` |
| Deploy | Docker multi-stage trên Render (BE), Vercel (FE) | `Dockerfile`, `render.yaml`, `vercel.json` |

**Clean Architecture bắt buộc:** Domain → Application → Infrastructure → Interface. Logic nghiệp vụ nặng (CPI/SPI, Revenue, Budget check) phải nằm trong `domain/logic`, cấm "Fat Services".

---

## 3. Biến môi trường cần kiểm tra (wms-backend/.env)

File `.env` **không nằm trong git**. Trên máy mới phải tự tạo lại dựa vào `.env.example` + các giá trị thực dưới đây lấy từ dashboard Neon/Cloudinary/SMTP.

```env
# Neon DB
DATABASE_URL=postgresql://neondb_owner:<PASSWORD>@<HOST>.neon.tech/neondb?sslmode=require

# JWT
JWT_SECRET=<STRONG_RANDOM_64>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7

# Server
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174

# Cloudinary (MỚI thêm ở commit 1668b51)
CLOUDINARY_CLOUD_NAME=<...>
CLOUDINARY_API_KEY=<...>
CLOUDINARY_API_SECRET=<...>

# SMTP (optional — bỏ trống = console log)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@sh-group.vn
FRONTEND_URL=http://localhost:5174
```

> **Lưu ý quan trọng:** Phải có cả 3 biến `CLOUDINARY_*`, nếu không endpoint upload sẽ crash (module mới thêm trong 5 commit gần đây).

---

## 4. Các module Backend hiện có

Đường dẫn: `wms-backend/src/`

| Module | Ghi chú |
|--------|---------|
| `auth` | JWT access/refresh, lockout, password reset, audit logs |
| `users` | Provisioning, RBAC |
| `roles` | Role management |
| `organizations` | Org chart HR foundation |
| `employees` | Soft delete + status |
| `master-data` | FK refactor đã audit |
| `projects` | Project Management expansion (Phase 1 finalized) |
| `project-plans` | WBS, planning |
| `project-schedule` | Scheduling |
| `project-monitoring` | CPI/SPI, ITD/PTD |
| `project-requests` | **(MỚI)** Có file upload, PENDING_INFO workflow, activity log |
| `documents` | **(MỚI)** Centralized document module — folders, files, notifications |
| `approvals` | Upgrade approval workflow + alternative approver + is_mandatory |
| `procurement` | Mua sắm |
| `suppliers` | Nhà cung cấp |
| `products` | Sản phẩm |
| `inventory` / `inbound` / `outbound` | WMS |
| `tms` / `vehicles` | Transport |
| `reports` | Báo cáo |
| `system-settings` | Cấu hình hệ thống |
| `upload` | Endpoint nhận file → đẩy Cloudinary |
| `shared` | `CloudStorageService` (Cloudinary integration) |
| `seed` | Oracle-like seed data (POC: Revenue = %Progress × ContractValue) |

**Tổng số migration TypeORM:** 21 file trong `wms-backend/src/migrations/`, cuối cùng là `1775807803033-PendingInfoAndAttachments.ts`.

---

## 5. Công việc gần nhất (20 commit cuối)

```
5196ebd fix(upload): set type=upload + access_mode=public for Cloudinary
4cf0bff feat(project-requests): centralized document module + activity log
d9777a5 feat(project-requests): file upload for all roles + Cloudinary API
8b10167 feat(project-requests): add file upload UI for approvers + upload API
1668b51 feat(shared): add CloudStorageService with Cloudinary integration
9ae35ee fix(deploy): add migration PENDING_INFO + attachments + is_blacklisted
83371ea feat(project-requests): add PENDING_INFO workflow + file attachments
fbc731f feat(project-requests): Edit + Delete cho draft requests
14e7c75 fix(projects): audit fixes — budget control, type safety, tests, FE sync
b7f4bf5 feat(projects): expand Project Management module per ERP Central spec
b9b8e60 fix(cors): allow all Vercel preview URLs (*.vercel.app)
4a9590d fix(deploy): create logs directory for non-root user in Docker
09785a4 fix(deploy): correct typeorm CLI path to wms-backend/node_modules
0f31311 feat(deploy): switch to Docker multi-stage build for Render
822c30d fix(deploy): bind 0.0.0.0 so Render health check reach the app
c19412e fix(deploy): add @tailwindcss/oxide-linux-x64-gnu for Render build
e5fe450 fix(deploy): fix lightningcss-linux-x64-gnu resolution on Render
72f484b fix(deploy): add lightningcss-linux-x64-gnu as optional dep for Render
a3a4a9f fix: resolve frontend ESLint errors + strengthen lint rules
48cf36d fix(deploy): restore rm -rf + keep optional rollup dep
```

**Chủ đề chính đợt gần đây:** hoàn thiện upload file qua Cloudinary + workflow PENDING_INFO cho Project Requests + centralized document module.

---

## 6. Checklist kiểm tra sau khi mở máy mới

Chạy lần lượt — mỗi bước PASS mới sang bước kế tiếp.

### 6.1. Git & source
- [ ] `git status` → clean, branch = `main`
- [ ] `git log -1` → HEAD = `5196ebd`
- [ ] `git pull` → up to date

### 6.2. Dependencies
- [ ] `npm install` chạy xong không lỗi ở cả 2 workspace
- [ ] `wms-backend/node_modules` và `wms-frontend/node_modules` tồn tại

### 6.3. Environment
- [ ] `wms-backend/.env` đầy đủ 3 biến `CLOUDINARY_*`
- [ ] `DATABASE_URL` trỏ Neon production hoặc local DB tuỳ ý
- [ ] `JWT_SECRET` không rỗng

### 6.4. Database
- [ ] `npm run migration:run --workspace=wms-backend` → không có migration mới pending
- [ ] Kiểm tra các bảng: `users`, `auth_logs`, `projects`, `project_requests`, `request_attachments`, `project_documents`, `workflow_logs` đều tồn tại
- [ ] Seed data (nếu dùng local): `npm run seed --workspace=wms-backend`

### 6.5. Backend khởi động
- [ ] `npm run start-safe` — pre-flight check PASS
- [ ] NestJS log: "Application is running on: http://0.0.0.0:3000"
- [ ] `curl http://localhost:3000/health` → 200 OK

### 6.6. Frontend khởi động
- [ ] Vite log: `Local: http://localhost:5174`
- [ ] Mở browser → trang Login hiển thị đầy đủ component
- [ ] Đăng nhập thành công → redirect dashboard
- [ ] Refresh trang → session còn giữ (refresh token cookie)

### 6.7. Smoke test nghiệp vụ
- [ ] Tạo 1 Project Request mới → upload 1 file → file lên Cloudinary (có URL `res.cloudinary.com`)
- [ ] Approver duyệt request → workflow log ghi nhận
- [ ] Chuyển trạng thái `PENDING_INFO` → yêu cầu bổ sung → requester bổ sung file
- [ ] Budget control: tạo transaction vượt ngân sách → bị chặn với lỗi hard limit

---

## 7. Tài liệu tham chiếu quan trọng

| File | Nội dung |
|------|----------|
| `CLAUDE.md` | Index 5-Gate SDLC rules |
| `DEPLOY.md` | Hướng dẫn deploy Render + Vercel chi tiết |
| `docs/specs/central-cons-payment-flow.md` | Luồng thanh toán ERP Central (cross-check mọi approval flow) |
| `docs/specs/auth-sa-design.md` | Thiết kế Auth module |
| `docs/specs/approval-workflow-SA_DESIGN.md` | Thiết kế workflow phê duyệt |
| `docs/specs/org-chart-hr-foundation-sa-design.md` | Org chart + HR |
| `docs/specs/rbac-project-roles-sa-design.md` | RBAC cho project roles |
| `docs/management/PHASE1_COMPLETION_REPORT.md` | Báo cáo hoàn thành Phase 1 |
| `docs/management/token-logs.md` | Tracking token từng session |
| `docs/diagrams/` | Mermaid sequence + class diagrams |

---

## 8. Những điều KHÔNG được làm trên máy mới

- Không chạy `git push --force` lên `main`
- Không xoá migration cũ — chỉ thêm migration mới
- Không commit file `.env` (đã gitignore, cẩn thận khi stage bằng `git add .`)
- Không dùng `Write` tool để tạo file `.tsx` tiếng Việt (lỗi Unicode trên Windows) — dùng Node script
- Không skip pre-flight check khi start dev

---

## 9. Liên hệ nhanh khi kẹt

- **Lỗi kết nối Neon DB:** kiểm tra IP allowlist + `sslmode=require`
- **Lỗi Cloudinary 401:** verify 3 biến env + `access_mode=public` (đã fix ở commit 5196ebd)
- **Port 3000 bị chiếm:** script `wms-backend/scripts/kill-port.sh` chạy tự động qua `prestart:dev` hook
- **CORS lỗi khi test từ Vercel preview:** đã cho phép `*.vercel.app` (commit b9b8e60)

---

**Kết thúc handoff.** Sau khi mọi mục trong §6 đều PASS → máy mới đã sẵn sàng tiếp tục công việc.
