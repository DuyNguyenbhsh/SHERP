# Sequence Diagram: Luồng Đăng nhập (Authentication Flow)

> **Module:** Auth | **Skill:** Architectural Visualizer
> **Source:** `wms-backend/src/auth/`
> **Ngày tạo:** 2026-03-26

## 1. Luồng Đăng nhập (Login Flow)

```mermaid
sequenceDiagram
    autonumber
    actor User as Client (Browser/App)
    participant AC as AuthController<br/>/auth/login
    participant AS as AuthService<br/>login()
    participant DB_U as DB: users
    participant DB_UR as DB: user_roles → roles
    participant DB_RP as DB: role_privileges → privileges
    participant JWT as JwtService<br/>sign()

    User->>+AC: POST /auth/login<br/>{ username, password }

    AC->>+AS: login(username, password)

    Note over AS,DB_U: Step 1: Tìm User theo username
    AS->>+DB_U: SELECT * FROM users<br/>WHERE username = ?
    DB_U-->>-AS: User { id, username, password_hash }

    alt User không tồn tại
        AS-->>AC: ❌ 401 UnauthorizedException<br/>"Sai tài khoản hoặc mật khẩu"
        AC-->>User: HTTP 401
    end

    Note over AS: Step 2: Verify mật khẩu (bcrypt)
    AS->>AS: bcrypt.compare(password, password_hash)

    alt Mật khẩu sai
        AS-->>AC: ❌ 401 UnauthorizedException<br/>"Sai tài khoản hoặc mật khẩu"
        AC-->>User: HTTP 401
    end

    Note over AS,DB_UR: Step 3: Lấy tất cả Roles của User
    AS->>+DB_UR: SELECT ur.*, r.* FROM user_roles ur<br/>JOIN roles r ON ur.role_id = r.id<br/>WHERE ur.user_id = ?
    DB_UR-->>-AS: UserRole[] { role.id, role.role_code }

    Note over AS,DB_RP: Step 4: Aggregate Privileges (deduplicate)
    AS->>+DB_RP: SELECT rp.*, p.* FROM role_privileges rp<br/>JOIN privileges p ON rp.privilege_id = p.id<br/>WHERE rp.role_id IN (roleId1, roleId2, ...)
    DB_RP-->>-AS: RolePrivilege[] { privilege.privilege_code }
    AS->>AS: privilegeCodes = [...new Set(codes)]

    Note over AS,JWT: Step 5: Tạo JWT Token
    AS->>AS: payload = { sub: user.id,<br/>username, privileges[] }
    AS->>+JWT: sign(payload)<br/>secret = JWT_SECRET<br/>expiresIn = JWT_EXPIRES_IN || '24h'
    JWT-->>-AS: access_token (signed JWT)

    AS-->>-AC: { access_token, user: { id, username, role } }
    AC-->>-User: ✅ HTTP 200<br/>{ access_token, user }

    Note over User: Client lưu access_token<br/>vào localStorage/cookie
```

## 2. Luồng Xác thực Request (Protected Route Flow)

```mermaid
sequenceDiagram
    autonumber
    actor User as Client (Browser/App)
    participant Guard1 as JwtAuthGuard
    participant Strat as JwtStrategy<br/>validate()
    participant Guard2 as PrivilegeGuard
    participant Ctrl as Controller<br/>@RequirePrivilege('X')
    participant Svc as Service

    User->>+Guard1: GET /api/protected-route<br/>Authorization: Bearer <token>

    Note over Guard1,Strat: Step 1: Verify JWT Token
    Guard1->>+Strat: Extract token từ header<br/>Verify signature (JWT_SECRET)<br/>Check expiration

    alt Token invalid / expired / missing
        Strat-->>User: ❌ 401 UnauthorizedException
    end

    Strat->>Strat: Decode payload
    Strat-->>-Guard1: req.user = {<br/>  userId: payload.sub,<br/>  username: payload.username,<br/>  privileges: payload.privileges[]<br/>}

    Note over Guard2: Step 2: Check Privileges
    Guard1->>+Guard2: Pass → next guard

    Guard2->>Guard2: Read @RequirePrivilege('CREATE_PO')<br/>from route metadata

    alt Không có @RequirePrivilege decorator
        Guard2->>Ctrl: ✅ Cho phép (no privilege check needed)
    end

    Guard2->>Guard2: requiredPrivileges.some(<br/>  p => user.privileges.includes(p)<br/>)

    alt User KHÔNG có privilege cần thiết
        Guard2-->>User: ❌ 403 ForbiddenException<br/>"Bạn không có quyền thực hiện thao tác này.<br/>Yêu cầu: [CREATE_PO]"
    end

    Guard2-->>-Ctrl: ✅ Authorized
    Ctrl->>+Svc: Execute business logic
    Svc-->>-Ctrl: Result
    Ctrl-->>-User: ✅ HTTP 200 { status, message, data }
```

## 3. Class Diagram: RBAC (Role-Based Access Control)

```mermaid
classDiagram
    class User {
        +UUID id
        +String username (unique)
        +String password_hash
        +Boolean is_active
        +Employee? employee
        +DateTime created_at
        +DateTime updated_at
    }

    class UserRole {
        +UUID id
        +User user
        +Role role
        +Organization? organization
    }

    class Role {
        +UUID id
        +String role_code (unique)
        +String role_name
        +String? description
        +Boolean is_active
        +DateTime created_at
        +DateTime updated_at
    }

    class RolePrivilege {
        +UUID id
        +Role role
        +Privilege privilege
        +DateTime assigned_at
    }

    class Privilege {
        +UUID id
        +String privilege_code (unique)
        +String privilege_name
        +String? module
        +Boolean is_active
        +DateTime created_at
        +DateTime updated_at
    }

    class JwtPayload {
        +UUID sub (userId)
        +String username
        +String[] privileges
        +Number iat
        +Number exp
    }

    User "1" --> "*" UserRole : has
    UserRole "*" --> "1" Role : belongs to
    Role "1" --> "*" RolePrivilege : grants
    RolePrivilege "*" --> "1" Privilege : references
    User ..> JwtPayload : login() produces
```

## 4. Tóm tắt kỹ thuật

| Thành phần | File | Chi tiết |
|-----------|------|----------|
| Login endpoint | `auth.controller.ts:15-18` | POST /auth/login, nhận { username, password } |
| Login logic | `auth.service.ts:20-64` | Verify → Aggregate privileges → Sign JWT |
| JWT Strategy | `jwt.strategy.ts:8-24` | Extract Bearer token, verify, map to req.user |
| Auth Guard | `jwt-auth.guard.ts:9` | Extends AuthGuard('jwt'), chặn 401 |
| Privilege Guard | `privilege.guard.ts:11-33` | Đọc @RequirePrivilege metadata, check `.some()`, chặn 403 |
| JWT Config | `auth.module.ts:24-27` | Secret: JWT_SECRET, Expiry: JWT_EXPIRES_IN \|\| '24h' |

### DB Query Chain khi Login:
```
users (1 query) → user_roles + roles (1 query) → role_privileges + privileges (1 query)
= Tổng cộng 3 queries cho mỗi lần đăng nhập
```

### Stateless Authorization:
- Privileges được nhúng vào JWT payload → không cần query DB khi check quyền
- Trade-off: Nếu admin thay đổi quyền, user phải login lại để nhận JWT mới
