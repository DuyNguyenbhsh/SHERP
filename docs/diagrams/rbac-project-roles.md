# RBAC — Sơ đồ phân quyền 3 Vai trò Dự án

> **Skill 1: Architectural Visualizer**
> **Ngày tạo:** 2026-03-26

## 1. Luồng tương tác PD ↔ PM ↔ Accountant

```mermaid
sequenceDiagram
    autonumber
    actor PM as Project Manager
    actor PD as Project Director
    actor ACC as Project Accountant
    participant SYS as SH ERP System

    Note over PM,ACC: ═══ PHASE 1: Khởi tạo Dự án ═══

    PM->>SYS: Tạo Project Request (SUBMIT_REQUEST)
    SYS-->>PD: Notification: "Có yêu cầu dự án mới"
    PD->>SYS: Approve Request (APPROVE_PROJECT)
    SYS->>SYS: Auto-create Project

    Note over PM,ACC: ═══ PHASE 2: Lập kế hoạch ═══

    PM->>SYS: Tạo WBS (MANAGE_WBS)
    PM->>SYS: Tạo BOQ (MANAGE_BOQ)
    PM->>SYS: Thiết lập Budget (MANAGE_BUDGET)
    PM->>SYS: Lập tiến độ (MANAGE_SCHEDULE)
    PM->>SYS: Submit Plan (SUBMIT_PLAN)
    SYS-->>PD: Notification: "Có kế hoạch cần duyệt"
    PD->>SYS: Approve Plan (APPROVE_PLAN)

    Note over PM,ACC: ═══ PHASE 3: Vận hành ═══

    PM->>SYS: Ghi nhận giao dịch (MANAGE_TRANSACTION)
    PM->>SYS: Cập nhật tiến độ WBS (MANAGE_WBS)
    PM->>SYS: Submit báo cáo (SUBMIT_REPORT)
    SYS-->>PD: Notification: "Có báo cáo cần duyệt"
    PD->>SYS: Approve Report (APPROVE_REPORT)
    ACC->>SYS: Xem tài chính (VIEW_PROJECT_FINANCE)
    ACC->>SYS: Xác minh giao dịch (MANAGE_TRANSACTION)

    Note over PM,ACC: ═══ PHASE 4: Thay đổi (nếu có) ═══

    PM->>SYS: Submit Variation Order (SUBMIT_VO)
    SYS-->>PD: Notification: "VO ảnh hưởng ngân sách"
    PD->>SYS: Approve VO (APPROVE_VO)
    SYS->>SYS: Update Budget

    Note over PM,ACC: ═══ PHASE 5: Quyết toán ═══

    ACC->>SYS: Tạo Settlement (MANAGE_SETTLEMENT)
    ACC->>SYS: Đối chiếu Budget vs Actual
    ACC->>SYS: Finalize Settlement (MANAGE_SETTLEMENT)
    PD->>SYS: Xem KPI tổng (VIEW_PROJECT_FINANCE)
```

## 2. Class Diagram — RBAC Model

```mermaid
classDiagram
    class Role {
        +String role_code
        +String role_name
        +String description
    }

    class Privilege {
        +String privilege_code
        +String privilege_name
        +String module
    }

    class ProjectDirector {
        VIEW_PROJECTS ✅
        VIEW_PROJECT_FINANCE ✅
        APPROVE_PROJECT ✅
        APPROVE_PLAN ✅
        APPROVE_REPORT ✅
        APPROVE_VO ✅
        ASSIGN_PROJECT_MEMBER ✅
        DELETE_PROJECT ✅
        Total: 8 privileges
    }

    class ProjectManager {
        VIEW_PROJECTS ✅
        VIEW_PROJECT_FINANCE ✅
        CREATE_PROJECT ✅
        UPDATE_PROJECT ✅
        MANAGE_WBS ✅
        MANAGE_BOQ ✅
        MANAGE_CBS ✅
        MANAGE_BUDGET ✅
        MANAGE_TRANSACTION ✅
        MANAGE_SCHEDULE ✅
        SUBMIT_PLAN ✅
        SUBMIT_REPORT ✅
        SUBMIT_REQUEST ✅
        SUBMIT_VO ✅
        ASSIGN_PROJECT_MEMBER ✅
        Total: 15 privileges
    }

    class ProjectAccountant {
        VIEW_PROJECTS ✅
        VIEW_PROJECT_FINANCE ✅
        MANAGE_BUDGET ✅
        MANAGE_TRANSACTION ✅
        MANAGE_CBS ✅
        MANAGE_SETTLEMENT ✅
        Total: 6 privileges
    }

    Role "1" --> "*" Privilege : grants
    ProjectDirector --|> Role : role_code = PROJECT_DIRECTOR
    ProjectManager --|> Role : role_code = PROJECT_MANAGER
    ProjectAccountant --|> Role : role_code = PROJECT_ACCOUNTANT
```

## 3. Separation of Duties (SoD) Flow

```mermaid
flowchart LR
    subgraph PM["PM — Vận hành"]
        A1[Tạo WBS/BOQ/Budget]
        A2[Submit Plan/Report/VO]
        A3[Ghi nhận giao dịch]
    end

    subgraph PD["PD — Phê duyệt"]
        B1[Approve/Reject Plan]
        B2[Approve/Reject Report]
        B3[Approve/Reject VO]
        B4[Approve/Reject Request]
    end

    subgraph ACC["Accountant — Tài chính"]
        C1[Xác minh giao dịch]
        C2[Quyết toán Settlement]
        C3[Báo cáo CPI/SPI]
    end

    A2 -->|submit| B1
    A2 -->|submit| B2
    A2 -->|submit| B3
    A3 -->|verify| C1
    B3 -->|approved| C1
    C1 -->|finalize| C2

    style PM fill:#e3f2fd
    style PD fill:#fff3e0
    style ACC fill:#e8f5e9
```
