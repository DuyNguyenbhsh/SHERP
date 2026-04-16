# SH-GROUP ERP — API Authentication Guide

> **Đối tượng đọc:** Client developer tích hợp với SHERP Backend API.
> **Backend base URL:** `https://<host>/api` (prod) · `http://localhost:3000/api` (dev)
> **Swagger UI:** `https://<host>/docs`

---

## 1. Tổng quan

SHERP dùng **JWT Bearer Authentication** với mô hình Access + Refresh Token:

| Token | Vòng đời | Cơ chế lưu | Mục đích |
|-------|---------|-----------|----------|
| Access Token | 15 phút | `localStorage` / header | Kèm mọi request protected |
| Refresh Token | 7 ngày | HTTP-only cookie | Đổi Access Token mới khi hết hạn |

Mọi response bọc format chuẩn: `{ status: boolean, message: string, data: T }` (qua `TransformInterceptor`).

---

## 2. Login Flow

### Request
```http
POST /api/auth/login
Content-Type: application/json

{ "username": "admin", "password": "admin123" }
```

### Response (200)
```json
{
  "status": true,
  "message": "Đăng nhập thành công",
  "data": {
    "access_token": "eyJhbGc...",
    "refresh_token": "abc123...",
    "user": {
      "id": "uuid",
      "username": "admin",
      "role": "ADMIN",
      "privileges": ["MANAGE_USER", "VIEW_PO", "..."]
    }
  }
}
```

> `refresh_token` cũng được set vào cookie `refresh_token` (HttpOnly, Secure, SameSite=strict).

### Response (401) — sai thông tin hoặc tài khoản bị khoá
```json
{ "status": false, "message": "Sai tài khoản hoặc mật khẩu", "data": null }
```

Sau **5 lần sai liên tiếp**, tài khoản bị **khoá 15 phút** (auto-unlock).

---

## 3. Gọi Protected Endpoints

Gắn Access Token vào header `Authorization`:

```http
GET /api/users/me
Authorization: Bearer <access_token>
```

### Response (403) — thiếu privilege
```json
{
  "status": false,
  "message": "Bạn không có quyền thực hiện thao tác này. Yêu cầu: [MANAGE_USER]",
  "data": null
}
```

---

## 4. Refresh Token Flow

Khi Access Token hết hạn (401) → gọi refresh để nhận token mới:

```http
POST /api/auth/refresh
# Cookie refresh_token tự động kèm theo (HttpOnly)
```

Hoặc gửi trong body (nếu client không dùng cookie):
```json
{ "refresh_token": "abc123..." }
```

### Response
Giống Login response (mới cả access + refresh).

> **Token rotation:** Mỗi lần refresh, backend issue refresh token mới. Refresh cũ bị revoke. Nếu refresh cũ dùng lại → phát hiện **reuse attack**, tất cả session của user bị revoke, cần đăng nhập lại.

---

## 5. Logout

```http
POST /api/auth/logout
Authorization: Bearer <access_token>
```

Backend revoke refresh token hiện tại + xoá cookie. Client xoá `localStorage`.

---

## 6. Lấy thông tin user hiện tại

```http
GET /api/auth/me
Authorization: Bearer <access_token>
```

### Response
```json
{
  "status": true,
  "message": "Thanh cong",
  "data": {
    "id": "uuid",
    "username": "admin",
    "role": "ADMIN",
    "privileges": ["MANAGE_USER", "..."],
    "position": { "code": "PM", "name": "Project Manager", "scope": "CENTRAL" },
    "org_unit": { "code": "HQ", "name": "Head Office", "type": "HEADQUARTERS" },
    "project_scope": { "type": "CENTRAL", "project_ids": null }
  }
}
```

Dùng để **restore session** khi F5/reload — verify Access Token còn valid + làm giàu auth state.

---

## 7. Forgot / Reset Password

### Yêu cầu link reset
```http
POST /api/auth/forgot-password
Content-Type: application/json

{ "username": "admin" }
```

Response luôn **giống nhau** (không tiết lộ user có tồn tại). Token reset gửi qua email, hết hạn 30 phút.

### Đổi mật khẩu mới
```http
POST /api/auth/reset-password
Content-Type: application/json

{ "token": "<reset_token>", "new_password": "StrongP@ss123" }
```

---

## 8. Privilege Matrix (trích yếu)

Backend kiểm tra privilege qua `PrivilegeGuard`. Danh sách đầy đủ: `wms-backend/src/auth/enums/privilege.enum.ts`.

| Module | Privileges |
|--------|-----------|
| Users / RBAC | `MANAGE_USER`, `MANAGE_ROLE`, `MANAGE_ORGANIZATION` |
| Procurement | `VIEW_PO`, `CREATE_PO`, `UPDATE_PO`, `APPROVE_PO`, `EXPORT_PO` |
| WMS | `VIEW_INVENTORY`, `RECEIVE_INBOUND`, `SHIP_OUTBOUND`, `MANAGE_INBOUND`, `MANAGE_INVENTORY`, `MANAGE_OUTBOUND` |
| Master Data | `MANAGE_PRODUCT`, `MANAGE_SUPPLIER`, `MANAGE_MASTER_DATA` |
| TMS | `MANAGE_TMS`, `MANAGE_VEHICLE` |
| Projects | `MANAGE_PROJECTS` |
| HCM | `MANAGE_EMPLOYEE` |

Client nên dùng privilege list để **hide/disable UI controls** (không thay thế cho backend guard).

---

## 9. Ví dụ Client Integration

### Axios interceptor (TypeScript)
```typescript
import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // Cookie refresh_token
})

// Gắn Access Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-refresh khi 401
let isRefreshing = false
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry && !isRefreshing) {
      original._retry = true
      isRefreshing = true
      try {
        const { data } = await api.post('/auth/refresh')
        localStorage.setItem('access_token', data.data.access_token)
        original.headers.Authorization = `Bearer ${data.data.access_token}`
        return api(original)
      } catch {
        localStorage.removeItem('access_token')
        window.location.href = '/login'
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  },
)
```

### cURL
```bash
# Login
TOKEN=$(curl -s -X POST https://<host>/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' \
  | jq -r '.data.access_token')

# Protected call
curl -s https://<host>/api/users \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## 10. Security Checklist cho Client

- [ ] Access Token lưu trong `localStorage` / memory — KHÔNG log ra console
- [ ] Refresh Token dùng cookie HttpOnly (đã cấu hình server-side)
- [ ] Luôn gọi API qua HTTPS ở production
- [ ] Clear tokens khi logout + khi refresh fail
- [ ] Không share Access Token giữa các user / tab
- [ ] Kiểm tra privilege ở UI (ẩn/disable control), nhưng TIN TƯỞNG backend làm authoritative check
- [ ] Xử lý 401 → auto-refresh (tối đa 1 lần); 403 → show "không đủ quyền"

---

## 11. Troubleshooting

| Triệu chứng | Nguyên nhân | Cách sửa |
|-------------|------------|----------|
| `401 Unauthorized` ngay sau login | JWT_SECRET khác giữa sign & verify | Verify env `JWT_SECRET` đồng bộ |
| `CORS error` | Domain client không có trong `ALLOWED_ORIGINS` | Thêm domain vào backend env, restart |
| `403 privilege` | User chưa được cấp quyền | Admin gán role/privilege cho user |
| Refresh liên tục fail | Cookie refresh_token bị block (`SameSite=strict` cross-origin) | Cùng domain hoặc chuyển body-based refresh |
| Login OK nhưng `/auth/me` fail | Access Token đã hết hạn (>15p) | Gọi `/auth/refresh` trước |

---

## 12. Tham chiếu

- Backend source: `wms-backend/src/auth/`
- Privilege matrix: `wms-backend/src/auth/enums/privilege.enum.ts`
- Deploy env vars: `DEPLOY.md` §2
- Frontend auth store mẫu: `wms-frontend/src/features/auth/model/auth.store.ts`
- Swagger UI: `/docs` endpoint trên backend
