# Sequence Diagrams: Auth Module — Complete Flows

> **Module:** Auth | **Skill:** Architectural Visualizer
> **Ngày cập nhật:** 2026-03-26
> **Bao gồm:** Login + Refresh + Forgot Password + Reset Password

---

## 1. Login Flow (Lockout + Audit + Refresh Token)

```mermaid
sequenceDiagram
    autonumber
    actor User as Client
    participant Ctrl as AuthController
    participant Svc as AuthService
    participant Lock as lockout.logic
    participant DB as Database
    participant Log as AuthLogService

    User->>+Ctrl: POST /auth/login { username, password }
    Ctrl->>Ctrl: Validate LoginDto
    Ctrl->>+Svc: login(dto, ip, ua)
    Svc->>+DB: SELECT FROM users WHERE username = ?
    DB-->>-Svc: User | null

    alt User not found
        Svc->>Log: LOGIN_FAILED "Tài khoản không tồn tại"
        Svc-->>Ctrl: 401
    end

    Svc->>+Lock: checkLockout(count, locked_until)
    Lock-->>-Svc: { locked, remainingMinutes }

    alt Đang bị khoá
        Svc->>Log: LOGIN_FAILED "tạm khoá"
        Svc-->>Ctrl: 401
    end

    Svc->>Svc: bcrypt.compare(password, hash)

    alt Sai mật khẩu
        Svc->>Lock: applyFailedAttempt(count)
        Svc->>DB: UPDATE users SET failed_count++
        Svc->>Log: LOGIN_FAILED | ACCOUNT_LOCKED
        Svc-->>Ctrl: 401
    end

    Svc->>DB: UPDATE users SET failed_count = 0
    Svc->>DB: Aggregate privileges
    Svc->>Svc: Sign access_token (15m)
    Svc->>Svc: Generate refresh_token (SHA-256)
    Svc->>DB: INSERT refresh_tokens
    Svc->>Log: LOGIN_SUCCESS
    Svc-->>-Ctrl: { access_token, refresh_token, user }
    Ctrl->>Ctrl: Set-Cookie: sh_refresh_token (HttpOnly)
    Ctrl-->>-User: 200 { access_token, user }
```

## 2. Token Refresh Flow (Rotation + Reuse Detection)

```mermaid
sequenceDiagram
    autonumber
    actor User as Client
    participant Ctrl as AuthController
    participant Svc as AuthService
    participant DB as Database
    participant Log as AuthLogService

    User->>+Ctrl: POST /auth/refresh<br/>Cookie: sh_refresh_token
    Ctrl->>+Svc: refreshTokens(token, ip, ua)
    Svc->>Svc: SHA-256 hash token
    Svc->>+DB: SELECT FROM refresh_tokens WHERE hash = ?
    DB-->>-Svc: Token | null

    alt Token not found / expired
        Svc-->>Ctrl: 401
    end

    alt is_revoked = true (REUSE ATTACK)
        Svc->>DB: Revoke ALL tokens of this user
        Svc->>Log: SUSPICIOUS_REUSE
        Svc-->>Ctrl: 401 "Bất thường bảo mật"
    end

    Svc->>DB: Revoke old token
    Svc->>Svc: Sign new access_token
    Svc->>Svc: Generate new refresh_token
    Svc->>DB: INSERT new refresh_token
    Svc->>Log: TOKEN_REFRESH
    Svc-->>-Ctrl: { access_token, refresh_token }
    Ctrl->>Ctrl: Set-Cookie: new refresh_token
    Ctrl-->>-User: 200 { access_token }
```

## 3. Forgot Password Flow (Anti-Enumeration)

```mermaid
sequenceDiagram
    autonumber
    actor User as Client
    participant Ctrl as AuthController
    participant Svc as AuthService
    participant DB as Database
    participant Mail as MailService
    participant Log as AuthLogService

    User->>+Ctrl: POST /auth/forgot-password<br/>{ username }
    Ctrl->>+Svc: forgotPassword(username, ip, ua)
    Svc->>+DB: SELECT FROM users WHERE username = ?
    DB-->>-Svc: User | null

    alt User NOT found
        Note over Svc: KHÔNG tiết lộ user tồn tại
        Svc-->>Ctrl: 200 "Nếu tài khoản tồn tại..."
    end

    Svc->>DB: Vô hiệu hoá tokens cũ (is_used = true)
    Svc->>Svc: Generate raw token (32 bytes hex)
    Svc->>Svc: SHA-256 hash → token_hash
    Svc->>DB: INSERT password_reset_tokens<br/>(hash, expires = now + 30min)

    alt SMTP configured
        Svc->>+Mail: sendResetPasswordEmail(email, rawToken)
        Mail->>Mail: Build HTML email with reset link
        Mail-->>-Svc: Email sent
    else SMTP not configured
        Svc->>+Mail: sendResetPasswordEmail(email, rawToken)
        Mail->>Mail: console.warn() reset link
        Mail-->>-Svc: Logged to console
    end

    Svc->>Log: PASSWORD_RESET { action: "requested" }
    Svc-->>-Ctrl: { message: "Nếu tài khoản tồn tại..." }
    Ctrl-->>-User: 200 (cùng message dù user có hay không)
```

## 4. Reset Password Flow (Token Validation)

```mermaid
sequenceDiagram
    autonumber
    actor User as Client
    participant Ctrl as AuthController
    participant Svc as AuthService
    participant Policy as password-policy.logic
    participant DB as Database
    participant Log as AuthLogService

    User->>+Ctrl: POST /auth/reset-password<br/>{ token, new_password }
    Ctrl->>+Svc: resetPassword(token, password, ip, ua)

    Svc->>+Policy: validatePasswordPolicy(password)
    Policy-->>-Svc: { valid, errors[] }

    alt Password không đủ mạnh
        Svc-->>Ctrl: 401 "Thiếu chữ hoa, ký tự đặc biệt..."
    end

    Svc->>Svc: SHA-256 hash token
    Svc->>+DB: SELECT FROM password_reset_tokens WHERE hash = ?
    DB-->>-Svc: ResetToken | null

    alt Token not found
        Svc-->>Ctrl: 401 "Link không hợp lệ"
    end
    alt Token is_used = true
        Svc-->>Ctrl: 401 "Link đã được sử dụng"
    end
    alt Token expired
        Svc-->>Ctrl: 401 "Link đã hết hạn (30 phút)"
    end

    Svc->>DB: UPDATE password_reset_tokens SET is_used = true
    Svc->>Svc: bcrypt.hash(new_password)
    Svc->>DB: UPDATE users SET password_hash, failed_count=0, locked_until=null
    Svc->>DB: UPDATE refresh_tokens SET is_revoked = true (ALL)
    Svc->>Log: PASSWORD_RESET { action: "completed" }
    Svc-->>-Ctrl: { message: "Đặt lại thành công" }
    Ctrl-->>-User: 200
```
