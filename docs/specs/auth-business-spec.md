# BA_SPEC: Module Auth — SH-GROUP ERP

> **Feature:** Authentication, Authorization & Security Audit
> **Chuẩn tham chiếu:** Oracle Fusion Cloud — Security & Access Control
> **Ngày tạo:** 2026-03-26
> **Trạng thái:** GATE 1 — BA ANALYSIS

---

## 1. Bối cảnh nghiệp vụ

Hệ thống ERP SH-GROUP phục vụ nhiều phòng ban (Kho, Mua hàng, Dự án, Tài chính). Module Auth là cánh cổng duy nhất — phải đảm bảo:
- Xác thực danh tính chính xác
- Phân quyền theo vai trò (RBAC)
- Ghi vết mọi hành động truy cập (Audit Trail)
- Chống tấn công brute-force

---

## 2. User Stories

### US-01: Đăng nhập chuẩn (Standard Login)
> **As a** User (Admin/PM/PD/Warehouse Staff),
> **I want to** đăng nhập bằng username và password,
> **So that** tôi có thể truy cập hệ thống với đúng quyền hạn của mình.

**Acceptance Criteria:**
- Nhập username + password → nhận JWT access_token
- Hệ thống xác định Role ngay lập tức → Frontend hiển thị menu tương ứng
- Password sai → thông báo chung "Sai tài khoản hoặc mật khẩu" (không tiết lộ field nào sai)
- Tài khoản bị khóa (is_active = false) → từ chối đăng nhập

### US-02: Ghi nhớ đăng nhập (Remember Me — Refresh Token)
> **As a** User,
> **I want to** tick "Ghi nhớ đăng nhập",
> **So that** tôi không phải đăng nhập lại mỗi khi mở trình duyệt.

**Acceptance Criteria:**
- Khi login thành công → trả cả `access_token` (ngắn hạn, 15 phút) và `refresh_token` (dài hạn, 7 ngày)
- `refresh_token` lưu trong HttpOnly Cookie (không lưu localStorage — chống XSS)
- Khi `access_token` hết hạn → Frontend tự gọi `POST /auth/refresh` để lấy token mới
- Nếu `refresh_token` cũng hết hạn → redirect về trang Login
- Mỗi lần refresh → xoay token mới (Token Rotation) → token cũ vô hiệu

### US-03: Quên mật khẩu (Forgot Password)
> **As a** User,
> **I want to** reset mật khẩu khi quên,
> **So that** tôi có thể lấy lại quyền truy cập mà không cần IT hỗ trợ.

**Acceptance Criteria:**
- Nhập email/username → hệ thống gửi OTP 6 số qua email (hết hạn sau 5 phút)
- Xác nhận OTP → cho phép đặt mật khẩu mới
- Mật khẩu mới phải tuân thủ Security Policy (BR-01)
- Sau khi đổi → huỷ tất cả refresh_token cũ (force re-login toàn bộ devices)

### US-04: Phân loại truy cập (Access Control)
> **As a** System,
> **I want to** xác định Role + Privileges ngay sau login,
> **So that** Frontend hiển thị đúng menu/tính năng cho từng vai trò.

**Acceptance Criteria:**
- JWT payload chứa: userId, username, role, privileges[]
- Frontend đọc privileges[] → render sidebar/menu tương ứng
- Roles chuẩn: SUPER_ADMIN, PROJECT_MANAGER, PROJECT_DIRECTOR, WAREHOUSE_STAFF, PROCUREMENT_OFFICER, ACCOUNTANT
- Nếu user có nhiều roles → merge privileges (deduplicate)

### US-05: Đổi mật khẩu (Change Password)
> **As a** User,
> **I want to** đổi mật khẩu khi đang đăng nhập,
> **So that** tôi có thể tăng bảo mật tài khoản.

**Acceptance Criteria:**
- Phải nhập đúng mật khẩu cũ
- Mật khẩu mới tuân thủ Security Policy (BR-01)
- Mật khẩu mới không được trùng 3 mật khẩu gần nhất
- Sau khi đổi → huỷ tất cả refresh_token (force re-login)

---

## 3. Business Rules (Siết chặt)

### BR-01: Security Policy — Password
| Quy tắc | Chi tiết |
|---------|---------|
| Độ dài tối thiểu | 8 ký tự |
| Chữ hoa | Ít nhất 1 |
| Chữ thường | Ít nhất 1 |
| Ký tự đặc biệt | Ít nhất 1 (`!@#$%^&*`) |
| Số | Ít nhất 1 |
| Lịch sử mật khẩu | Không trùng 3 mật khẩu gần nhất |

**Regex:** `^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$`

### BR-02: Account Lockout (Chống Brute-force)
```
IF failed_login_count >= 5 (trong 15 phút)
   THEN → Khoá tài khoản 15 phút
   AND  → Ghi auth_log: event = 'ACCOUNT_LOCKED'
   AND  → Notify admin (optional)

IF login thành công
   THEN → Reset failed_login_count = 0
```

**Trường cần thêm trên User entity:**
- `failed_login_count: int (default 0)`
- `locked_until: datetime (nullable)`

### BR-03: JWT Token Lifecycle
| Token | Thời hạn | Lưu trữ | Mục đích |
|-------|---------|---------|----------|
| Access Token | 15 phút | Frontend memory (Zustand) | Xác thực API calls |
| Refresh Token | 7 ngày | HttpOnly Cookie + DB | Gia hạn access_token |

**Token Rotation:**
- Mỗi lần gọi `/auth/refresh` → cấp access_token mới + refresh_token mới
- Refresh token cũ bị vô hiệu hoá ngay lập tức
- Nếu phát hiện refresh token đã bị vô hiệu hoá được dùng lại → huỷ TOÀN BỘ refresh tokens của user đó (phát hiện token bị đánh cắp)

### BR-04: Audit Log — Ghi vết mọi hành động Auth
| Event | Dữ liệu ghi | Mục đích |
|-------|-------------|----------|
| `LOGIN_SUCCESS` | user_id, ip, user_agent, timestamp | Truy vết đăng nhập |
| `LOGIN_FAILED` | username (input), ip, user_agent, reason | Phát hiện brute-force |
| `ACCOUNT_LOCKED` | user_id, ip, failed_count | Cảnh báo bảo mật |
| `TOKEN_REFRESH` | user_id, ip | Theo dõi session |
| `LOGOUT` | user_id, ip | Kết thúc session |
| `PASSWORD_CHANGED` | user_id, ip, changed_by | Audit bảo mật |
| `PASSWORD_RESET` | user_id, ip, method (OTP) | Audit bảo mật |

### BR-05: Session Management
- Mỗi user tối đa 5 active sessions (5 devices)
- Session thứ 6 → tự động huỷ session cũ nhất
- Admin có thể force-logout bất kỳ user nào

---

## 4. Hạch toán & Ảnh hưởng tài chính

Module Auth **không trực tiếp** tạo giao dịch tài chính, nhưng:
- Privilege `APPROVE_PO`, `APPROVE_BUDGET_OVERRIDE` quyết định ai được phê duyệt tài chính
- Auth logs là bằng chứng kiểm toán (audit evidence) cho compliance
- Account lockout có thể block người duyệt khẩn cấp → cần quy trình unlock nhanh

---

## 5. Trường dữ liệu cần thiết

### 5.1 User Entity (MỞ RỘNG — thêm fields bảo mật)
| Field | Type | Mô tả | Hiện trạng |
|-------|------|--------|-----------|
| `id` | UUID | PK | ✅ Có |
| `username` | VARCHAR(100) | Unique login name | ✅ Có |
| `password_hash` | VARCHAR | Bcrypt hash | ✅ Có |
| `is_active` | BOOLEAN | Soft delete | ✅ Có |
| `employee` | FK → Employee | Link HR | ✅ Có |
| `created_at` | DATETIME | Auto | ✅ Có |
| `updated_at` | DATETIME | Auto | ✅ Có |
| `failed_login_count` | INT (default 0) | Đếm login sai | ❌ **THIẾU** |
| `locked_until` | DATETIME (nullable) | Thời điểm hết khoá | ❌ **THIẾU** |
| `password_changed_at` | DATETIME (nullable) | Lần đổi pass cuối | ❌ **THIẾU** |
| `password_history` | JSON | 3 hash gần nhất | ❌ **THIẾU** |

### 5.2 Refresh Token (BẢNG MỚI)
| Field | Type | Mô tả |
|-------|------|--------|
| `id` | UUID | PK |
| `user_id` | FK → User | Người sở hữu |
| `token_hash` | VARCHAR | SHA-256 hash của refresh token |
| `device_info` | VARCHAR(500) | User-Agent + IP fingerprint |
| `expires_at` | DATETIME | Thời hạn (7 ngày) |
| `is_revoked` | BOOLEAN | Đã thu hồi chưa |
| `created_at` | DATETIME | Ngày cấp |

### 5.3 Auth Log (BẢNG MỚI)
| Field | Type | Mô tả |
|-------|------|--------|
| `id` | UUID | PK |
| `user_id` | FK → User (nullable) | Null nếu login failed với username không tồn tại |
| `username_input` | VARCHAR(100) | Username được nhập (luôn ghi) |
| `event` | ENUM | LOGIN_SUCCESS / LOGIN_FAILED / ACCOUNT_LOCKED / TOKEN_REFRESH / LOGOUT / PASSWORD_CHANGED / PASSWORD_RESET |
| `ip_address` | VARCHAR(45) | IPv4 hoặc IPv6 |
| `user_agent` | VARCHAR(500) | Browser/Device info |
| `failure_reason` | VARCHAR(255) | Lý do thất bại (nullable) |
| `metadata` | JSON | Dữ liệu bổ sung (nullable) |
| `created_at` | DATETIME | Timestamp |

### 5.4 Password Reset Token (BẢNG MỚI)
| Field | Type | Mô tả |
|-------|------|--------|
| `id` | UUID | PK |
| `user_id` | FK → User | Người yêu cầu |
| `otp_hash` | VARCHAR | SHA-256 hash của OTP 6 số |
| `expires_at` | DATETIME | Hết hạn (5 phút) |
| `is_used` | BOOLEAN | Đã sử dụng chưa |
| `created_at` | DATETIME | Timestamp |

---

## 6. Gap Analysis — Hiện trạng vs Yêu cầu

| Tính năng | Hiện trạng | Yêu cầu | Priority |
|-----------|-----------|---------|----------|
| Standard Login | ✅ Có (nhưng không có DTO) | DTO + validation | 🔴 P0 |
| Access Token (JWT) | ✅ Có (24h) | Giảm xuống 15 phút | 🔴 P0 |
| Refresh Token | ❌ Không có | Cần tạo mới | 🔴 P0 |
| Remember Me | ❌ Không có | HttpOnly Cookie | 🔴 P0 |
| Password Policy | ❌ Không có | Regex + validation | 🟡 P1 |
| Account Lockout | ❌ Không có | 5 lần / 15 phút | 🟡 P1 |
| Auth Logs | ❌ Không có | Bảng mới + ghi mọi event | 🟡 P1 |
| Forgot Password | ❌ Không có | OTP qua email | 🟢 P2 |
| Change Password | ❌ Không có | Cần API mới | 🟢 P2 |
| Session Management | ❌ Không có | Max 5 devices | 🟢 P2 |
| Login DTO | ❌ body: any | class-validator DTO | 🔴 P0 |

---

## 7. Luồng nghiệp vụ

### 7.1 Login Flow (Có Lockout + Audit)
```
[User nhập username/password]
        │
        ▼
[Validate DTO: LoginDto]
        │
        ▼
[Tìm User by username]
        │
        ├── Không tồn tại
        │     → Ghi auth_log: LOGIN_FAILED (user not found)
        │     → Return 401 "Sai tài khoản hoặc mật khẩu"
        │
        └── Tồn tại
              │
              ▼
        [Check locked_until > now?]
              │
              ├── Đang bị khoá
              │     → Ghi auth_log: LOGIN_FAILED (account locked)
              │     → Return 401 "Tài khoản tạm khoá, thử lại sau X phút"
              │
              └── Không bị khoá
                    │
                    ▼
              [bcrypt.compare(password, hash)]
                    │
                    ├── Sai
                    │     → failed_login_count += 1
                    │     → Nếu count >= 5 → locked_until = now + 15min
                    │     → Ghi auth_log: LOGIN_FAILED / ACCOUNT_LOCKED
                    │     → Return 401
                    │
                    └── Đúng
                          │
                          ▼
                    [Reset failed_login_count = 0]
                    [Aggregate privileges]
                    [Sign access_token (15min)]
                    [Sign refresh_token (7d) → lưu DB]
                    [Ghi auth_log: LOGIN_SUCCESS]
                          │
                          ▼
                    [Return { access_token, refresh_token (cookie), user }]
```

### 7.2 Token Refresh Flow
```
[Frontend: access_token hết hạn]
        │
        ▼
[POST /auth/refresh (gửi refresh_token qua cookie)]
        │
        ▼
[Tìm refresh_token trong DB]
        │
        ├── Không tồn tại / Hết hạn / is_revoked = true
        │     │
        │     ├── Nếu is_revoked = true
        │     │     → NGHI NGỜ BỊ ĐÁNH CẮP
        │     │     → Huỷ TẤT CẢ refresh tokens của user
        │     │     → Ghi auth_log: SUSPICIOUS_REUSE
        │     │
        │     └── Return 401 → Redirect Login
        │
        └── Hợp lệ
              │
              ▼
        [Revoke token cũ (is_revoked = true)]
        [Sign access_token mới]
        [Sign refresh_token mới → lưu DB]
        [Ghi auth_log: TOKEN_REFRESH]
              │
              ▼
        [Return { access_token, refresh_token (cookie) }]
```

---

## 8. KPIs & Metrics

| KPI | Công thức | Mục đích |
|-----|-----------|----------|
| Login Success Rate | `LOGIN_SUCCESS / Total Login Attempts × 100` | Đo UX |
| Failed Login Rate | `LOGIN_FAILED / Total × 100` | Phát hiện tấn công |
| Account Lock Rate | `ACCOUNT_LOCKED events / Unique users × 100` | Đánh giá policy |
| Avg Sessions per User | `Active refresh tokens / Active users` | Giám sát multi-device |
| Token Refresh Rate | `TOKEN_REFRESH / hour` | Tải hệ thống |

---

## 9. BA Checklist

- [x] User Stories đầy đủ (5 stories)
- [x] Business Rules rõ ràng (5 rules: Password, Lockout, JWT, Audit, Session)
- [x] Gap Analysis vs code hiện tại
- [x] Luồng nghiệp vụ chi tiết (Login + Token Refresh)
- [x] Data fields: 4 entities (User mở rộng + 3 bảng mới)
- [x] KPIs xác định
- [x] Priority phân loại (P0/P1/P2)

---

> **BA Sign-off:** Tài liệu sẵn sàng chuyển **GATE 2 — SA Design**.
