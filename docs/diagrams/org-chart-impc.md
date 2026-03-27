# Org Chart & Login Scope — IMPC Construction

> **Skill 1: Architectural Visualizer**
> **Ngày tạo:** 2026-03-26

---

## 1. Org Chart — SH-GROUP (IMPC Focus)

```mermaid
graph TD
    SHG["🏢 SH-GROUP<br/><i>Root Corporation</i>"]

    SHG --> SC["Star Computer<br/><i>DIVISION</i>"]
    SHG --> SG["Star Gaming<br/><i>DIVISION</i>"]
    SHG --> IMPC["🏗️ IMPC<br/><i>DIVISION — Xây dựng & Phát triển</i>"]

    %% IMPC Central Departments
    IMPC --> PMO["📋 Phòng PMO<br/><i>CORPORATE_DEPT</i><br/>PD, PMO Manager, C&C"]
    IMPC --> FIN["💰 Phòng Tài chính<br/><i>CORPORATE_DEPT</i><br/>CFO, KT Trung tâm"]
    IMPC --> HR["👥 Phòng Nhân sự<br/><i>CORPORATE_DEPT</i>"]
    IMPC --> PROC["📦 Phòng Mua hàng<br/><i>CORPORATE_DEPT</i>"]
    IMPC --> CC["📊 Bộ phận C&C<br/><i>CORPORATE_DEPT</i><br/>Cost & Contract"]

    %% IMPC Project Sites
    IMPC --> S1["🔨 CT Vincom Q7<br/><i>PROJECT_SITE</i><br/>CHT, PM, QS, KT"]
    IMPC --> S2["🔨 CT Thủ Đức Central<br/><i>PROJECT_SITE</i><br/>CHT, PM, QS, KT"]
    IMPC --> S3["🔨 CT SaiGon Airport<br/><i>PROJECT_SITE</i><br/>CHT, PM, QS, KT"]

    %% Styling
    style SHG fill:#1a56db,color:#fff,stroke:#1a56db
    style IMPC fill:#f59e0b,color:#fff,stroke:#f59e0b
    style PMO fill:#e3f2fd,stroke:#1565c0
    style FIN fill:#e8f5e9,stroke:#2e7d32
    style HR fill:#fce4ec,stroke:#c62828
    style PROC fill:#fff3e0,stroke:#e65100
    style CC fill:#f3e5f5,stroke:#7b1fa2
    style S1 fill:#fff9c4,stroke:#f57f17
    style S2 fill:#fff9c4,stroke:#f57f17
    style S3 fill:#fff9c4,stroke:#f57f17
    style SC fill:#e0e0e0,stroke:#757575
    style SG fill:#e0e0e0,stroke:#757575
```

---

## 2. Login → Scope Resolution Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User as Client
    participant Auth as AuthService
    participant DB as Database
    participant FE as Frontend

    User->>+Auth: POST /auth/login { username, password }

    Note over Auth,DB: Standard Auth (Lockout + Bcrypt + JWT)
    Auth->>DB: Validate credentials
    Auth->>DB: Aggregate privileges

    Note over Auth,DB: ═══ NEW: Scope Resolution ═══
    Auth->>+DB: SELECT e.*, p.scope, p.position_code, o.org_type<br/>FROM employees e<br/>JOIN positions p ON e.position_id = p.id<br/>JOIN organizations o ON e.department_id = o.id<br/>WHERE e.id = user.employee_id
    DB-->>-Auth: Position { scope: 'SITE' | 'CENTRAL' }

    alt scope = 'CENTRAL'
        Auth->>Auth: projectScope = { type: 'CENTRAL', project_ids: null }
        Note over Auth: PD/CFO/C&C → thấy toàn Portfolio
    else scope = 'SITE'
        Auth->>+DB: SELECT project_id FROM project_assignments<br/>WHERE employee_id = ? AND is_active = true
        DB-->>-Auth: project_ids = ['uuid-1', 'uuid-2']
        Auth->>Auth: projectScope = { type: 'SITE', project_ids: [...] }
        Note over Auth: PM/CHT/QS → chỉ thấy dự án assigned
    end

    Auth-->>-User: 200 {<br/>  access_token,<br/>  user: { id, username, role },<br/>  position: { code, name, scope },<br/>  org_unit: { code, name, type },<br/>  project_scope: { type, project_ids }<br/>}

    User->>+FE: Lưu scope vào Zustand store
    FE->>FE: Filter sidebar/data theo project_scope

    alt CENTRAL scope
        FE->>FE: Hiển thị tất cả Projects
        FE->>FE: Hiển thị Dashboard Portfolio
    else SITE scope
        FE->>FE: Chỉ hiển thị Projects trong project_ids
        FE->>FE: Hiển thị Dashboard per-Project
    end
```

---

## 3. Luồng Thanh toán NTP — Theo tài liệu PROJ.10 Central Cons

```mermaid
sequenceDiagram
    autonumber
    box rgb(255, 249, 196) SITE — Công trình
        actor GSHT as GSHT<br/>(Giám sát Hiện trường)
        actor QS as QS Công trình
        actor CHT as CHT<br/>(Chỉ huy trưởng)
    end

    box rgb(227, 242, 253) CENTRAL — Trụ sở
        actor GDDA as GĐDA<br/>(Giám đốc Dự án)
        actor CV as Chuyên viên C&C
        actor TP as Trưởng phòng C&C
    end

    Note over GSHT,TP: ═══ QUY TRÌNH THANH TOÁN NTP (PROJ.10) ═══

    rect rgb(255, 249, 196)
        Note over GSHT: Swimlane 1 — GSHT
        GSHT->>GSHT: Ghi nhận KL xây dựng<br/>theo tiến độ từng CV
        GSHT->>GSHT: Điều chỉnh KL<br/>trong phạm vi ngân sách
        GSHT->>QS: Chuyển dữ liệu KL
    end

    rect rgb(255, 243, 176)
        Note over QS: Swimlane 2 — QS Công trình
        QS->>QS: Kiểm tra + xác nhận KL đã thực hiện
        QS->>QS: Phiếu nhập kho mua hàng
        QS->>QS: Biên bản hiện trường / Phiếu xuất kho
        QS->>QS: Lập chứng từ phải thu
        QS->>QS: Lập Hồ sơ Thanh toán (HSTT)
        QS->>CHT: Trình HSTT duyệt
    end

    rect rgb(255, 224, 130)
        Note over CHT: Swimlane 3 — CHT (Deadline: ngày 7 hàng tháng)
        CHT->>CHT: Duyệt HSTT trên hệ thống
        Note over CHT: ✅ Duyệt cấp Site
        CHT->>CV: Chuyển Chuyên viên C&C
    end

    rect rgb(187, 222, 251)
        Note over GDDA: Swimlane 4 — GĐDA (SLA: 2 ngày)
        GDDA->>GDDA: Duyệt HSTT
        GDDA->>GDDA: Thông báo NTP xuất hoá đơn
        Note over GDDA: ✅ Duyệt cấp GĐDA
    end

    rect rgb(144, 202, 249)
        Note over CV,TP: Swimlane 5 — C&C (SLA: 4 ngày)
        CV->>CV: Kiểm tra tính hợp lý HSTT<br/>trên hệ thống
        CV->>TP: Trình Trưởng phòng
        TP->>TP: Kiểm tra + Xác nhận
        Note over TP: ✅ C&C xác nhận
    end

    rect rgb(255, 249, 196)
        Note over QS: Swimlane 6 — QS nhận phản hồi
        GDDA-->>QS: Hệ thống thông báo GĐDA đã duyệt
        QS->>QS: Thông báo NTP xuất hoá đơn
        Note over QS: 📧 NTP nhận thông báo → Xuất HĐ
    end
```

---

## 4. Position → Role → Privilege Chain

```mermaid
flowchart LR
    subgraph Positions["POSITION (Chức danh)"]
        P1[SITE_PM]
        P2[SITE_DIRECTOR]
        P3[PROJECT_DIRECTOR]
        P4[SITE_ACCOUNTANT]
        P5[CENTRAL_ACCOUNTANT]
        P6[CFO]
    end

    subgraph Roles["ROLE (Vai trò RBAC)"]
        R1[PROJECT_MANAGER<br/>15 privileges]
        R2[PROJECT_DIRECTOR<br/>8 privileges]
        R3[PROJECT_ACCOUNTANT<br/>6 privileges]
    end

    subgraph Scope["SCOPE (Dữ liệu)"]
        S1[SITE<br/>Chỉ project assigned]
        S2[CENTRAL<br/>Toàn portfolio]
    end

    P1 -->|default_role| R1
    P2 -->|default_role| R1
    P3 -->|default_role| R2
    P4 -->|default_role| R3
    P5 -->|default_role| R3
    P6 -->|default_role| R2

    P1 -->|scope| S1
    P2 -->|scope| S1
    P4 -->|scope| S1
    P3 -->|scope| S2
    P5 -->|scope| S2
    P6 -->|scope| S2

    style Positions fill:#fff3e0
    style Roles fill:#e3f2fd
    style Scope fill:#e8f5e9
```
