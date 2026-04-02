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
