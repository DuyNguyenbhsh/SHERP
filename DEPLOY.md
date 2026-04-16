# SH-GROUP ERP — Production Deployment Guide

## 1. Architecture

```
Browser --> Frontend (Vercel / Netlify) --> Backend API (Render / Railway) --> Neon DB (PostgreSQL)
```

| Component | Tech | Hosting |
|-----------|------|---------|
| Frontend | React + Vite | Vercel / Netlify |
| Backend | NestJS | Render / Railway / VPS |
| Database | PostgreSQL | Neon DB (already configured) |

---

## 2. Environment Variables

Copy these to your hosting provider's env settings:

### Backend (Render / Railway)

```env
# Database — Neon DB
DATABASE_URL=postgresql://neondb_owner:<PASSWORD>@<HOST>.neon.tech/neondb?sslmode=require

# Authentication
JWT_SECRET=<STRONG_RANDOM_SECRET_64_CHARS>
JWT_EXPIRES_IN=1d
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7

# Server
PORT=3000
NODE_ENV=production

# CORS — Frontend domain(s), comma-separated
ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://erp.sh-group.vn

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@sh-group.vn

# Frontend URL (for password reset links)
FRONTEND_URL=https://your-frontend.vercel.app
```

### Frontend (Vercel / Netlify)

```env
VITE_API_URL=https://your-backend.onrender.com/api
```

> **Luu y:** Frontend hien tai dung Vite proxy (`/api` -> `localhost:3000`).
> Khi deploy, thay `VITE_API_URL` thanh URL backend thuc te.

---

## 3. Neon DB Setup

1. Dang nhap https://console.neon.tech
2. Copy connection string tu Dashboard > Connection Details
3. Chon **Pooled connection** (co `-pooler` trong URL) de tang hieu suat
4. Gan vao `DATABASE_URL` env variable

---

## 4. Build & Deploy Commands

### Backend (Render)

```bash
# Build command
cd wms-backend && npm install && npm run build

# Start command
cd wms-backend && npm run migration:run && npm run start:prod
```

### Frontend (Vercel)

```bash
# Build command
cd wms-frontend && npm install && npm run build

# Output directory
wms-frontend/dist
```

### Local build test

```bash
# Tu root monorepo
npm run build            # Build ca backend + frontend
npm run db:migrate:prod  # Chay migration len Neon DB
npm run start:prod       # Khoi dong backend production
```

---

## 5. Render Deployment

1. Tao **Web Service** moi tren https://render.com
2. Connect GitHub repo
3. Settings:
   - **Root Directory:** `wms-backend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run migration:run && npm run start:prod`
   - **Environment:** Node
4. Them tat ca env variables tu Section 2
5. Deploy

---

## 6. Vercel Deployment (Frontend)

1. Import repo tai https://vercel.com
2. Settings:
   - **Root Directory:** `wms-frontend`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Them env variable:
   ```
   VITE_API_URL=https://your-backend.onrender.com/api
   ```
4. Them file `wms-frontend/vercel.json` (rewrites cho SPA routing):
   ```json
   { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
   ```
5. Deploy

---

## 7. GitHub Actions CI/CD (Optional)

Tao file `.github/workflows/deploy.yml`:

```yaml
name: CI/CD
on:
  push:
    branches: [main]

jobs:
  build-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci
      - run: npm run build:backend
      - run: npm run build:frontend

      # Render/Vercel auto-deploy from main branch — no manual deploy step needed
```

---

## 8. Post-Deploy Checklist

- [ ] Backend health check: `GET /api` -> `{"status":true,"message":"Thanh cong"}`
- [ ] Swagger UI: `https://backend-url/docs`
- [ ] Frontend loads login page
- [ ] Login works (admin / admin123)
- [ ] CORS: No errors in browser console
- [ ] Database: Migration ran successfully (check Render logs)
- [ ] Excel export/import works (file download triggers)
- [ ] Approval workflow CRUD works

---

## 9. Security Checklist

- [ ] `JWT_SECRET` is unique, random, 64+ characters
- [ ] `DATABASE_URL` uses SSL (`sslmode=require`)
- [ ] `ALLOWED_ORIGINS` only lists your actual frontend domain(s)
- [ ] Helmet middleware is active (auto-enabled in main.ts)
- [ ] `.env` file is in `.gitignore` (never commit secrets)
- [ ] Default admin password changed after first login

---

## 10. Sinh Secrets (JWT_SECRET)

Tuyệt đối không dùng template mặc định. Sinh 64 ký tự ngẫu nhiên:

```bash
# Linux / macOS / Git Bash
openssl rand -hex 32

# Node (cross-platform)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# PowerShell (Windows)
-join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })
```

Copy output → dán vào `JWT_SECRET` trên hosting provider. **Không commit** giá trị này.

---

## 11. Docker Deployment (Option Alternative)

Dự án có `Dockerfile` + `docker-compose.yml` — dùng khi deploy trên VPS hoặc Render (Docker runtime).

### 11.1 Local production test

```bash
# Từ root monorepo
cp .env.example .env         # Điền DATABASE_URL, JWT_SECRET, ALLOWED_ORIGINS
docker compose up -d --build
docker compose logs -f sh-erp
```

Health check: `curl http://localhost:3000/api` → `{"status":true,...}`

### 11.2 Render (Docker runtime)

`render.yaml` đã cấu hình sẵn. Trên Render Dashboard:

1. New → **Blueprint** → Connect repo → Chọn `render.yaml`
2. Điền các env `sync: false`: `DATABASE_URL`, `JWT_SECRET`, `ALLOWED_ORIGINS`, `FRONTEND_URL`
3. Deploy — container tự chạy `migration:run` trước khi start

### 11.3 Image layers

Multi-stage build (Dockerfile): `deps → build-frontend → build-backend → prod-deps → runner`. Runner dùng non-root user `erp` + `HEALTHCHECK` 30s interval.

---

## 12. Pre-Deploy Checklist (BẮT BUỘC)

Chạy thứ tự sau TRƯỚC mỗi deploy production:

```bash
# 1. Backup DB production (KHÔNG BỎ QUA)
DATABASE_URL="postgresql://..." npm run db:backup
# Output: backups/backup_YYYYMMDD_HHMM.sql.gz

# 2. Pre-flight check (env, DB, lint, type, port)
npm run check

# 3. Build local để verify compile OK
npm run build

# 4. Review migration files sẽ chạy
ls wms-backend/src/migrations/  # So sánh với migration đã chạy trên prod
```

Checklist:

- [ ] Backup DB gần nhất < 1 giờ
- [ ] `npm run check` PASS (0 errors)
- [ ] `npm run build` PASS
- [ ] Migration files mới đã review kỹ (xem `wms-backend/CLAUDE.md` §5.3)
- [ ] Không có file `.env` trong git diff
- [ ] JWT_SECRET production KHÁC dev
- [ ] ALLOWED_ORIGINS chỉ chứa domain thật

---

## 13. Migration & Rollback Procedure

### 13.1 Chạy migration

Container tự chạy qua `CMD` trong Dockerfile. Với Render non-Docker, start command:
```bash
npm run migration:run && npm run start:prod
```

### 13.2 Rollback migration gần nhất

```bash
cd wms-backend
npm run migration:revert   # Rollback 1 migration, chạy nhiều lần nếu cần revert nhiều
```

> **Cảnh báo (deploy-rules):** Migration có `ALTER TABLE DROP COLUMN` hoặc `DROP TABLE` → revert KHÔNG khôi phục được data. PHẢI restore từ backup:

```bash
# Restore từ backup gzipped (KHÔNG chạy nếu không chắc)
gunzip -c backups/backup_YYYYMMDD_HHMM.sql.gz | psql "$DATABASE_URL"
```

### 13.3 Kiểm tra sau migration

```bash
# Verify tables & row counts (thay placeholder)
psql "$DATABASE_URL" -c "\dt"                    # List tables
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users;"
psql "$DATABASE_URL" -c "SELECT name FROM typeorm_migrations ORDER BY timestamp DESC LIMIT 5;"
```

---

## 14. Smoke Test (Post-Deploy)

Thực hiện ngay sau deploy, đúng 4 bước theo test-rules §Manual Verification:

```bash
# 1. Backend health
curl -s https://<backend-url>/api | jq
# Expected: {"status":true,"message":"Thanh cong"}

# 2. Swagger UI (manual)
# Mở https://<backend-url>/docs — verify UI load, bearer auth hiện

# 3. Auth flow (replace admin password)
curl -X POST https://<backend-url>/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"<PROD_PASSWORD>"}' | jq

# 4. Protected route với token
TOKEN=$(curl -s ... | jq -r '.data.access_token')
curl -s https://<backend-url>/api/users/me \
  -H "Authorization: Bearer $TOKEN" | jq
```

Script tham khảo: `scripts/smoke-test-document-control.mjs` (có sẵn cho document module).

Checklist UI:
- [ ] Login page render đủ (username, password, submit)
- [ ] Login sai → error banner hiển thị đúng
- [ ] Login đúng → redirect dashboard
- [ ] Refresh page → session giữ nguyên (JWT từ localStorage)

---

## 15. Troubleshooting

| Triệu chứng | Nguyên nhân phổ biến | Cách sửa |
|---|---|---|
| `ECONNREFUSED` khi gọi `/api` | Backend chưa start hoặc port sai | Check Render logs, verify `PORT=3000` |
| `CORS policy blocked` | `ALLOWED_ORIGINS` thiếu domain frontend | Thêm domain vào env, restart backend |
| `401 Unauthorized` sau login | `JWT_SECRET` khác giữa lúc sign và verify | Verify env `JWT_SECRET` đồng bộ giữa các instance |
| `SSL required` khi connect Neon | `DATABASE_URL` thiếu `?sslmode=require` | Append vào query string |
| Migration fail `relation already exists` | Migration chạy 2 lần hoặc DB cũ | Check `typeorm_migrations` table, revert hoặc xoá entry lỗi |
| Container không start (Docker) | `node dist/main.js` không tìm thấy | Verify build stage OK, check `wms-backend/dist/main.js` tồn tại |
| Frontend 404 trên refresh | SPA fallback không cấu hình | Vercel: `vercel.json` rewrites; Docker: NestJS `ServeStaticModule` đã xử lý |
| Slow cold start | Neon DB suspend sau idle | Đã dùng pooled connection; warm-up health check 30s |

### Kênh hỗ trợ
- Logs: Render Dashboard → Service → Logs (live tail)
- DB: Neon Console → Monitoring
- Local debug: `docker compose logs -f sh-erp`
