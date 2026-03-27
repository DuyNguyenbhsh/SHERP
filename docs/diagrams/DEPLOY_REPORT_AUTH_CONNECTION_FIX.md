# DEPLOY REPORT: Auth Connection Error Fix

> **Lỗi:** "Không thể kết nối tới máy chủ. Vui lòng kiểm tra mạng hoặc liên hệ IT."
> **Ngày:** 2026-03-26
> **Agent:** DEPLOY

---

## 1. Nguyên nhân gốc (Root Cause)

### NGUYÊN NHÂN CHÍNH: Backend KHÔNG CHẠY

| Kiểm tra | Kết quả |
|----------|---------|
| Port 3000 listening? | **NO** — `PORT_3000_NOT_LISTENING` |
| Node process running? | **NO** — Không có process nào |
| curl localhost:3000 | **CONNECT_FAILED** — HTTP status 000 |

**Kết luận:** Backend NestJS chưa được khởi động. Frontend gọi `/api/auth/login` → Vite proxy forward tới `http://localhost:3000` → Connection refused → Axios bắt `ERR_NETWORK` → Hiển thị toast "Không thể kết nối tới máy chủ".

---

## 2. Chuỗi lỗi (Error Chain)

```
Frontend (Vite dev server)
  ↓ POST /api/auth/login
Vite Proxy (vite.config.ts:18-23)
  ↓ Forward to http://localhost:3000/api/auth/login
Backend (NOT RUNNING)
  ↓ Connection refused
Axios interceptor (axios.ts:58)
  ↓ error.code === 'ERR_NETWORK'
Toast (axios.ts:59-62)
  → "Không thể kết nối tới máy chủ"
```

---

## 3. Các điểm đã kiểm tra và XÁC NHẬN OK

### 3.1 JWT_SECRET — ✅ KHỚP
| Thành phần | Giá trị | File |
|-----------|---------|------|
| `.env` | `SH_WMS_SUPER_SECRET_KEY_PRODUCTION_2026` | wms-backend/.env:2 |
| JwtModule.sign() | `configService.get('JWT_SECRET')` | auth.module.ts:25 |
| JwtStrategy.verify() | `configService.getOrThrow('JWT_SECRET')` | jwt.strategy.ts:12 |

**Kết luận:** Cùng 1 key, sign và verify nhất quán. Không có mismatch.

### 3.2 API Prefix /api — ✅ KHỚP
| Thành phần | Cấu hình | File |
|-----------|----------|------|
| Backend global prefix | `app.setGlobalPrefix('api')` | main.ts:34 |
| Backend route mapped | `/api/auth/login` (POST) | Confirmed in startup log |
| Frontend baseURL | `VITE_API_URL=/api` | wms-frontend/.env:1 |
| Frontend axios | `api.post('/auth/login')` | auth.api.ts:26 |
| Vite proxy | `/api` → `http://localhost:3000` (no rewrite) | vite.config.ts:19-23 |

**Chuỗi hoàn chỉnh:** Frontend `/api/auth/login` → Vite proxy → `http://localhost:3000/api/auth/login` → Backend route `/api/auth/login` ✅

### 3.3 CORS — ✅ OK
| Origin | Whitelist |
|--------|-----------|
| `http://localhost:5173` | ✅ Default trong main.ts:16 |
| `http://localhost:5174-5176` | ✅ Default trong main.ts:16 |
| Vite proxy (same-origin) | ✅ Bypass CORS (proxy mode) |

### 3.4 Refactor Impact — ✅ KHÔNG ẢNH HƯỞNG
Việc refactor `.claude/` folder (di chuyển role files, tạo rules/) chỉ ảnh hưởng đến cấu hình AI, **không thay đổi bất kỳ file source code nào** trong `wms-backend/` hoặc `wms-frontend/`.

---

## 4. Xác nhận sau Fix

| Test | Kết quả |
|------|---------|
| `npm run start:dev` | ✅ Backend started, 0 compilation errors |
| DB connection (NeonDB) | ✅ TypeOrmCoreModule initialized |
| `POST /api/auth/login` | ✅ HTTP 200, access_token returned |
| JWT payload | ✅ 27 privileges embedded (SUPER_ADMIN) |
| Route mapping | ✅ `/api/auth/login` (POST), `/api/auth/me` (GET) confirmed |

---

## 5. Deploy Checklist

- [x] Backend khởi động thành công (port 3000)
- [x] DB connection OK (NeonDB SSL)
- [x] JWT_SECRET khớp giữa sign/verify
- [x] API prefix `/api` nhất quán BE↔FE
- [x] CORS whitelist đúng cho dev (localhost:5173-5176)
- [x] Login endpoint trả về token hợp lệ
- [x] Không có migration mới cần chạy
- [x] Không có env vars mới cần thêm
- [ ] **Lưu ý:** SSL warning từ pg driver — nên thêm `sslmode=verify-full` vào DATABASE_URL

---

## 6. Khuyến nghị

**Để tránh lỗi này tái diễn, cần khởi động backend trước khi mở frontend:**

```bash
# Terminal 1: Backend
cd "C:/Users/Admin/SH ERP/wms-backend" && npm run start:dev

# Terminal 2: Frontend (chờ backend ready)
cd "C:/Users/Admin/SH ERP/wms-frontend" && npm run dev
```
