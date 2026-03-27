# Approval Chain — Sequence Diagram

```mermaid
sequenceDiagram
    participant Client as Frontend
    participant API as EmployeesController
    participant SVC as EmployeesService
    participant DB as PostgreSQL

    Client->>API: GET /employees/:id/approval-chain
    API->>SVC: getApprovalChain(employeeId)

    loop Traverse manager chain (max 10 levels)
        SVC->>DB: SELECT employee + manager + position WHERE id = currentId
        DB-->>SVC: Employee with manager relation
        alt manager exists & no cycle
            SVC->>SVC: Push manager to chain, move to next level
        else no manager or cycle detected
            SVC->>SVC: Break loop
        end
    end

    SVC-->>API: { chain: [{id, code, name, job_title, position}], depth }
    API-->>Client: 200 OK — Approval chain data
```

## Example Flow

```
Employee: Nguyen Van A (SITE_QS @ CT Vincom Q7)
  |
  v Manager Level 1
Tran Van B (SITE_DIRECTOR / CHT)
  |
  v Manager Level 2
Le Van C (PROJECT_DIRECTOR / GDDA)
  |
  v Manager Level 3 (Top — no manager)
NULL → Stop
```

## Entity Relationship

```mermaid
erDiagram
    EMPLOYEES {
        uuid id PK
        varchar employee_code UK
        varchar full_name
        varchar email
        varchar phone
        varchar job_title
        varchar status
        uuid department_id FK
        uuid position_id FK
        uuid manager_id FK
        jsonb document_refs
        date hire_date
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }

    SYSTEM_SETTINGS {
        uuid id PK
        varchar setting_key UK
        text setting_value
        varchar value_type
        varchar description
        varchar category
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    EMPLOYEES ||--o{ EMPLOYEES : "manager_id (self-ref)"
    EMPLOYEES }o--|| ORGANIZATIONS : "department_id"
    EMPLOYEES }o--o| POSITIONS : "position_id"
```
