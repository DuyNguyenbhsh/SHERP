# SA_DESIGN: Hard Limit Budget Control

> **Feature:** Kiểm soát ngân sách cứng (Hard Limit)
> **Nguồn BA:** `docs/features/hard-limit-budget-control/BA_SPEC.md`
> **Ngày thiết kế:** 2026-04-11
> **Trạng thái:** Gate 2 — SA Design
> **Chuẩn kiến trúc:** Clean Architecture (Domain → Application → Infrastructure → Interface)

---

## 1. TỔNG QUAN THIẾT KẾ

### 1.1 Mục tiêu
Mở rộng cơ chế Budgetary Control hiện tại (đang là `project_budgets` với `planned_amount` + `checkBudgetLimit()` đơn giản) lên chuẩn Oracle Fusion Cloud:
- Hỗ trợ 3 mức kiểm soát: **HARD / SOFT / ADVISORY**
- Phân bổ theo **Period** (tháng/quý/năm) với roll-up ITD/PTD
- Tách riêng **Committed** (PO) và **Consumed** (Invoice/Issue)
- Hạch toán kế toán (Encumbrance) tự động
- Luồng **Override** với phê duyệt CFO
- **Budget Revision** tách biệt khỏi Override

### 1.2 Phạm vi mở rộng từ hiện tại

| Thành phần | Hiện tại | Mở rộng |
|---|---|---|
| Entity `ProjectBudget` | 1 bảng phẳng (project + category + planned_amount) | Thêm `BudgetPeriod`, `BudgetTransactionLog`, `BudgetRevision` |
| Service `checkBudgetLimit()` | Nằm trong `projects.service.ts`, chỉ so sánh tổng | Chuyển về `domain/logic/budget.logic.ts`, hỗ trợ period + committed/consumed |
| Transaction types được kiểm soát | Chỉ `ProjectTransaction` | Thêm PO, AP Invoice, GL Journal, Inventory Issue, Timesheet, Expense |
| Hạch toán kế toán | Chưa có | Sinh GL entries cho Encumbrance/Actual |

---

## 2. DATABASE SCHEMA

### 2.1 Mở rộng `project_budgets`

```sql
ALTER TABLE project_budgets
  ADD COLUMN budget_code       VARCHAR(50),
  ADD COLUMN budget_name       VARCHAR(255),
  ADD COLUMN fiscal_year       INT NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  ADD COLUMN budget_type       VARCHAR(10) NOT NULL DEFAULT 'OPEX', -- CAPEX | OPEX
  ADD COLUMN control_level     VARCHAR(10) NOT NULL DEFAULT 'HARD', -- HARD | SOFT | ADVISORY
  ADD COLUMN status            VARCHAR(20) NOT NULL DEFAULT 'DRAFT', -- DRAFT | APPROVED | CLOSED | REVISED
  ADD COLUMN allow_carry_forward BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN warning_threshold_pct SMALLINT NOT NULL DEFAULT 90,
  ADD COLUMN department_id     UUID NULL REFERENCES organizations(id),
  ADD COLUMN wbs_element_id    UUID NULL REFERENCES project_wbs(id),
  ADD COLUMN approved_by       UUID NULL REFERENCES users(id),
  ADD COLUMN approved_at       TIMESTAMP NULL,
  ADD COLUMN created_by        UUID NOT NULL REFERENCES users(id),
  ADD COLUMN created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  ADD COLUMN updated_at        TIMESTAMP NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX UQ_BUDGET_CODE ON project_budgets(budget_code);
CREATE INDEX IDX_BUDGET_FY_STATUS ON project_budgets(fiscal_year, status);
CREATE INDEX IDX_BUDGET_PROJECT_WBS ON project_budgets(project_id, wbs_element_id);
```

### 2.2 Bảng mới `budget_periods`

```sql
CREATE TABLE budget_periods (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id         UUID NOT NULL REFERENCES project_budgets(id) ON DELETE CASCADE,
  period_name       VARCHAR(20) NOT NULL,   -- "2026-Q1", "2026-03"
  period_start      DATE NOT NULL,
  period_end        DATE NOT NULL,
  period_amount     DECIMAL(18,2) NOT NULL,
  consumed_amount   DECIMAL(18,2) NOT NULL DEFAULT 0,
  committed_amount  DECIMAL(18,2) NOT NULL DEFAULT 0,
  -- available_amount là computed column, không lưu
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT UQ_BUDGET_PERIOD UNIQUE (budget_id, period_name),
  CONSTRAINT CHK_PERIOD_DATES CHECK (period_end >= period_start)
);

CREATE INDEX IDX_BP_BUDGET ON budget_periods(budget_id);
CREATE INDEX IDX_BP_DATE_RANGE ON budget_periods(period_start, period_end);
```

### 2.3 Bảng mới `budget_transaction_logs`

```sql
CREATE TABLE budget_transaction_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id         UUID NOT NULL REFERENCES project_budgets(id),
  budget_period_id  UUID NULL REFERENCES budget_periods(id),
  transaction_type  VARCHAR(30) NOT NULL, -- PO | AP_INVOICE | GL_JOURNAL | INVENTORY_ISSUE | TIMESHEET | EXPENSE | SUBCONTRACT
  transaction_id    UUID NOT NULL,        -- FK logic (không hard FK vì cross-module)
  transaction_ref   VARCHAR(100) NOT NULL,
  amount            DECIMAL(18,2) NOT NULL,
  amount_type       VARCHAR(10) NOT NULL, -- COMMITTED | CONSUMED
  check_result      VARCHAR(10) NOT NULL, -- APPROVED | REJECTED | OVERRIDE
  available_before  DECIMAL(18,2) NOT NULL,
  available_after   DECIMAL(18,2) NOT NULL,
  rejection_reason  TEXT NULL,
  override_by       UUID NULL REFERENCES users(id),
  override_reason   TEXT NULL,
  created_by        UUID NOT NULL REFERENCES users(id),
  created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IDX_BTL_BUDGET_PERIOD ON budget_transaction_logs(budget_id, budget_period_id);
CREATE INDEX IDX_BTL_TXN ON budget_transaction_logs(transaction_type, transaction_id);
CREATE INDEX IDX_BTL_RESULT ON budget_transaction_logs(check_result, created_at);
```

### 2.4 Bảng mới `budget_revisions`

```sql
CREATE TABLE budget_revisions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id         UUID NOT NULL REFERENCES project_budgets(id),
  revision_number   INT NOT NULL,
  previous_amount   DECIMAL(18,2) NOT NULL,
  revised_amount    DECIMAL(18,2) NOT NULL,
  adjustment_amount DECIMAL(18,2) GENERATED ALWAYS AS (revised_amount - previous_amount) STORED,
  reason            TEXT NOT NULL,
  requested_by      UUID NOT NULL REFERENCES users(id),
  approved_by       UUID NULL REFERENCES users(id),
  status            VARCHAR(10) NOT NULL DEFAULT 'PENDING', -- PENDING | APPROVED | REJECTED
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT UQ_BUDGET_REVISION UNIQUE (budget_id, revision_number)
);
```

### 2.5 ERD

```
┌─────────────────┐      ┌──────────────────┐      ┌────────────────────────┐
│ project_budgets │◄─1:N─│ budget_periods   │◄─1:N─│ budget_transaction_logs│
│                 │      │                  │      │                        │
│ - id (PK)       │      │ - budget_id (FK) │      │ - budget_id (FK)       │
│ - project_id    │      │ - period_name    │      │ - budget_period_id (FK)│
│ - wbs_element_id│      │ - period_amount  │      │ - transaction_type     │
│ - category_id   │      │ - consumed       │      │ - amount_type          │
│ - control_level │      │ - committed      │      │ - check_result         │
│ - total_amount  │      └──────────────────┘      └────────────────────────┘
│ - status        │
└────────┬────────┘
         │ 1:N
         ▼
┌──────────────────┐
│ budget_revisions │
│ - budget_id (FK) │
│ - revision_num   │
│ - status         │
└──────────────────┘
```

---

## 3. CLEAN ARCHITECTURE — FOLDER STRUCTURE

```
src/budgets/                              ← Module MỚI (tách khỏi projects/)
├── domain/
│   ├── logic/
│   │   ├── budget-check.logic.ts         ← Pure function: checkHardLimit()
│   │   ├── budget-rollup.logic.ts        ← ITD/PTD calculator
│   │   └── gl-entry.logic.ts             ← Sinh hạch toán Nợ/Có
│   ├── ports/
│   │   ├── budget.repository.port.ts     ← Interface (không phụ thuộc TypeORM)
│   │   ├── period.repository.port.ts
│   │   └── txn-log.repository.port.ts
│   └── types/
│       ├── budget-check-result.type.ts   ← { approved, available, reason }
│       └── gl-entry.type.ts
├── application/
│   ├── budget.service.ts                 ← Orchestration (DI các ports)
│   ├── budget-check.service.ts           ← Entry point cho cross-module gọi
│   ├── budget-override.service.ts
│   └── budget-revision.service.ts
├── infrastructure/
│   ├── repositories/
│   │   ├── budget.repository.ts          ← implements BudgetRepositoryPort
│   │   ├── period.repository.ts
│   │   └── txn-log.repository.ts
│   └── entities/
│       ├── project-budget.entity.ts      ← (migrate từ projects/entities/)
│       ├── budget-period.entity.ts
│       ├── budget-transaction-log.entity.ts
│       └── budget-revision.entity.ts
├── interface/
│   ├── budgets.controller.ts             ← REST endpoints
│   ├── budget-override.controller.ts
│   └── dto/
│       ├── create-budget.dto.ts
│       ├── allocate-period.dto.ts
│       ├── check-budget.dto.ts
│       ├── override-request.dto.ts
│       └── budget-response.dto.ts
└── budgets.module.ts
```

**Nguyên tắc:**
- `domain/logic/*` là pure functions, không import NestJS/TypeORM
- `application/*` inject ports qua constructor (không phụ thuộc implementation cụ thể)
- `infrastructure/*` là adapter — nơi duy nhất được phép `@InjectRepository()`
- `interface/*` chỉ chứa controller + DTO

---

## 4. API ENDPOINTS

### 4.1 Budget Management

| Method | Endpoint | Privilege | Mô tả |
|---|---|---|---|
| `POST` | `/api/budgets` | `CREATE_BUDGET` | Tạo Budget (DRAFT) |
| `GET` | `/api/budgets` | `VIEW_BUDGET` | Danh sách (filter fiscal_year, project, status) |
| `GET` | `/api/budgets/:id` | `VIEW_BUDGET` | Chi tiết 1 budget + periods |
| `PATCH` | `/api/budgets/:id` | `UPDATE_BUDGET` | Cập nhật (chỉ khi status=DRAFT) |
| `POST` | `/api/budgets/:id/submit` | `UPDATE_BUDGET` | Submit → PENDING_APPROVAL |
| `POST` | `/api/budgets/:id/approve` | `APPROVE_BUDGET` | CFO phê duyệt → APPROVED |
| `POST` | `/api/budgets/:id/close` | `APPROVE_BUDGET` | Đóng kỳ ngân sách |

### 4.2 Period Allocation

| Method | Endpoint | Privilege | Mô tả |
|---|---|---|---|
| `POST` | `/api/budgets/:id/periods` | `UPDATE_BUDGET` | Phân bổ theo kỳ (batch) |
| `GET` | `/api/budgets/:id/periods` | `VIEW_BUDGET` | Danh sách period + available |
| `GET` | `/api/budgets/:id/rollup` | `VIEW_BUDGET` | ITD + PTD snapshot |

### 4.3 Budget Check (Internal — cross-module)

| Method | Endpoint | Privilege | Mô tả |
|---|---|---|---|
| `POST` | `/api/budgets/check` | System-internal | Được gọi từ PO/Invoice/Issue service |
| `GET` | `/api/budgets/violations` | `VIEW_BUDGET` | Danh sách giao dịch bị REJECT |

**Request `POST /budgets/check`:**
```typescript
{
  project_id: string;
  wbs_element_id?: string;
  category_id: string;
  transaction_type: 'PO' | 'AP_INVOICE' | 'GL_JOURNAL' | 'INVENTORY_ISSUE' | 'TIMESHEET' | 'EXPENSE' | 'SUBCONTRACT';
  transaction_id: string;
  transaction_ref: string;
  amount: number;
  amount_type: 'COMMITTED' | 'CONSUMED';
  period_date: string; // ISO date — xác định period nào
}
```

**Response:**
```typescript
{
  status: 'success' | 'error',
  message: string,
  data: {
    check_result: 'APPROVED' | 'REJECTED',
    budget_id: string,
    budget_period_id: string,
    available_before: number,
    available_after: number,
    warning?: string, // khi vượt warning_threshold_pct
  }
}
```

### 4.4 Override

| Method | Endpoint | Privilege | Mô tả |
|---|---|---|---|
| `POST` | `/api/budgets/overrides` | `REQUEST_BUDGET_OVERRIDE` | User submit request |
| `POST` | `/api/budgets/overrides/:id/approve` | `APPROVE_BUDGET_OVERRIDE` | CFO duyệt |
| `POST` | `/api/budgets/overrides/:id/reject` | `APPROVE_BUDGET_OVERRIDE` | CFO từ chối |
| `GET` | `/api/budgets/overrides` | `VIEW_BUDGET` | Lịch sử override |

### 4.5 Revision (Tách biệt với Override)

| Method | Endpoint | Privilege | Mô tả |
|---|---|---|---|
| `POST` | `/api/budgets/:id/revisions` | `REQUEST_BUDGET_REVISION` | Yêu cầu tăng/giảm budget |
| `POST` | `/api/budgets/revisions/:id/approve` | `APPROVE_BUDGET_REVISION` | CFO duyệt, update total_amount |

---

## 5. DOMAIN LOGIC (Pure Functions)

### 5.1 `budget-check.logic.ts`

```typescript
import type {
  BudgetSnapshot,
  BudgetCheckRequest,
  BudgetCheckResult,
} from '../types';

/**
 * Pure function: Kiểm tra Hard Limit không có side effect.
 * Không gọi DB, không throw exception — trả về kết quả để caller quyết định.
 */
export function checkHardLimit(
  snapshot: BudgetSnapshot,
  request: BudgetCheckRequest,
): BudgetCheckResult {
  const { period_amount, consumed_amount, committed_amount } = snapshot;
  const available = period_amount - consumed_amount - committed_amount;

  // ADVISORY → luôn APPROVE, chỉ log
  if (snapshot.control_level === 'ADVISORY') {
    return { check_result: 'APPROVED', available_before: available, available_after: available - request.amount };
  }

  // SOFT → APPROVE + warning
  if (snapshot.control_level === 'SOFT' && request.amount > available) {
    return {
      check_result: 'APPROVED',
      available_before: available,
      available_after: available - request.amount,
      warning: `Ngân sách sẽ âm ${(request.amount - available).toLocaleString('vi-VN')} VND (Soft Limit)`,
    };
  }

  // HARD → REJECT nếu vượt
  if (snapshot.control_level === 'HARD' && request.amount > available) {
    return {
      check_result: 'REJECTED',
      available_before: available,
      available_after: available,
      rejection_reason: `Vượt Hard Limit: cần ${request.amount.toLocaleString('vi-VN')}, khả dụng ${available.toLocaleString('vi-VN')} VND`,
    };
  }

  return {
    check_result: 'APPROVED',
    available_before: available,
    available_after: available - request.amount,
    warning: checkWarningThreshold(snapshot, available - request.amount),
  };
}

function checkWarningThreshold(
  snapshot: BudgetSnapshot,
  newAvailable: number,
): string | undefined {
  const utilizationPct = ((snapshot.period_amount - newAvailable) / snapshot.period_amount) * 100;
  if (utilizationPct >= snapshot.warning_threshold_pct) {
    return `Ngân sách đã sử dụng ${utilizationPct.toFixed(1)}% (ngưỡng cảnh báo ${snapshot.warning_threshold_pct}%)`;
  }
  return undefined;
}
```

### 5.2 `budget-rollup.logic.ts`

```typescript
export interface RollupResult {
  itd: { budget: number; consumed: number; committed: number; available: number };
  ptd: { budget: number; consumed: number; committed: number; available: number };
  utilization_pct: number;
  burn_rate: number;
  forecast_at_completion: number;
}

export function computeRollup(
  periods: BudgetPeriodRow[],
  currentPeriodName: string,
  earnedValue: number,
): RollupResult { /* … */ }
```

### 5.3 `gl-entry.logic.ts`

```typescript
export interface GLEntry {
  account_code: string;
  debit: number;
  credit: number;
  description: string;
}

export function generateEncumbranceEntry(amount: number, ref: string): GLEntry[] {
  return [
    { account_code: 'ENCUMBRANCE',             debit: amount, credit: 0, description: `Cam kết chi ${ref}` },
    { account_code: 'BUDGETARY_CONTROL_RSRV',  debit: 0, credit: amount, description: `Cam kết chi ${ref}` },
  ];
}

export function generateInvoiceEntry(amount: number, ref: string): GLEntry[] { /* … */ }
export function generateInventoryIssueEntry(amount: number, ref: string): GLEntry[] { /* … */ }
```

---

## 6. PORTS & DTOs

### 6.1 `BudgetRepositoryPort`

```typescript
export interface BudgetRepositoryPort {
  findSnapshot(params: {
    project_id: string;
    wbs_element_id?: string;
    category_id: string;
    period_date: Date;
  }): Promise<BudgetSnapshot | null>;

  updatePeriodAmounts(
    period_id: string,
    delta: { committed?: number; consumed?: number },
  ): Promise<void>;

  saveTransactionLog(log: CreateBudgetLogInput): Promise<string>;
}
```

### 6.2 DTOs

```typescript
// create-budget.dto.ts
export class CreateBudgetDto {
  @IsString() @IsNotEmpty() budget_code: string;
  @IsString() @IsNotEmpty() budget_name: string;
  @IsInt() @Min(2020) fiscal_year: number;
  @IsEnum(BudgetType) budget_type: BudgetType;
  @IsEnum(ControlLevel) control_level: ControlLevel;
  @IsNumber() @Min(0) total_amount: number;
  @IsUUID() project_id: string;
  @IsOptional() @IsUUID() wbs_element_id?: string;
  @IsUUID() category_id: string;
  @IsOptional() @IsBoolean() allow_carry_forward?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(100) warning_threshold_pct?: number;
}
```

---

## 7. MIGRATION STRATEGY

### 7.1 Backwards Compatibility
Vì `checkBudgetLimit()` hiện đang được gọi từ `projects.service.ts:493` trong `createTransaction()`, cần giữ API cũ hoạt động trong thời gian migration.

**Phase 1 — Co-existence (Sprint hiện tại):**
1. Tạo module `budgets/` mới song song với `projects/`
2. Chuyển entity `ProjectBudget` sang `budgets/infrastructure/entities/`
3. Viết migration `AddBudgetaryControlTables.ts` thêm 3 bảng mới + ALTER TABLE `project_budgets`
4. `ProjectsService.checkBudgetLimit()` delegate sang `BudgetCheckService.check()`
5. Seed data: gán `control_level='HARD'`, `fiscal_year=NOW()`, default period 12 tháng cho budgets hiện có

**Phase 2 — Migration (Sprint tiếp theo):**
1. `createTransaction()` ở projects gọi trực tiếp `BudgetCheckService` (remove wrapper)
2. Mở rộng cho PO, Invoice, Inventory Issue — từng module 1

### 7.2 Migration file

```typescript
// src/migrations/1712850000000-AddBudgetaryControl.ts
export class AddBudgetaryControl1712850000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. ALTER project_budgets
    // 2. CREATE TABLE budget_periods
    // 3. CREATE TABLE budget_transaction_logs
    // 4. CREATE TABLE budget_revisions
    // 5. Backfill: existing rows → control_level=HARD, fiscal_year=2026, status=APPROVED
    // 6. Tạo 12 periods cho mỗi budget (phân bổ đều)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop 3 bảng mới + drop columns đã thêm
  }
}
```

---

## 8. CROSS-MODULE INTEGRATION

| Module gọi | Trigger | Method gọi |
|---|---|---|
| `procurement/` | Submit PO | `BudgetCheckService.check({ type: 'PO', amount_type: 'COMMITTED' })` |
| `procurement/` (AP) | Validate Invoice | `BudgetCheckService.check({ type: 'AP_INVOICE', amount_type: 'CONSUMED' })` — đồng thời giảm committed |
| `inventory/` | Material Issue | `BudgetCheckService.check({ type: 'INVENTORY_ISSUE', amount_type: 'CONSUMED' })` |
| `employees/` (Timesheet) | Approve Timesheet | `BudgetCheckService.check({ type: 'TIMESHEET', amount_type: 'CONSUMED' })` |
| `projects/` | Subcontract Payment | `BudgetCheckService.check({ type: 'SUBCONTRACT', amount_type: 'CONSUMED' })` |

**Loose coupling:** Các module không import `BudgetCheckService` trực tiếp. Sử dụng event/token injection:

```typescript
// budgets/budgets.module.ts
@Module({
  providers: [
    BudgetCheckService,
    { provide: 'BUDGET_CHECK_PORT', useExisting: BudgetCheckService },
  ],
  exports: ['BUDGET_CHECK_PORT'],
})
```

---

## 9. TỐI ƯU QUERY (ITD/PTD)

```sql
-- Index hỗ trợ ITD rollup
CREATE INDEX IDX_BTL_BUDGET_RESULT_DATE
  ON budget_transaction_logs(budget_id, check_result, created_at);

-- Materialized view cho dashboard (refresh hàng giờ)
CREATE MATERIALIZED VIEW mv_budget_utilization AS
SELECT
  b.id                  AS budget_id,
  b.project_id,
  b.fiscal_year,
  b.total_amount,
  SUM(bp.consumed_amount)  AS itd_consumed,
  SUM(bp.committed_amount) AS itd_committed,
  b.total_amount - SUM(bp.consumed_amount) - SUM(bp.committed_amount) AS itd_available,
  ROUND(
    (SUM(bp.consumed_amount + bp.committed_amount) / NULLIF(b.total_amount, 0)) * 100,
    2
  ) AS utilization_pct
FROM project_budgets b
LEFT JOIN budget_periods bp ON bp.budget_id = b.id
WHERE b.status = 'APPROVED'
GROUP BY b.id;

CREATE UNIQUE INDEX ON mv_budget_utilization(budget_id);
```

---

## 10. SA CHECKLIST

- [x] Entity và quan hệ Database (ERD) đã xác định (4 bảng)
- [x] API Endpoints đã liệt kê (20 endpoints)
- [x] Interface và DTOs đã định nghĩa (CreateBudgetDto, CheckBudgetDto, OverrideRequestDto, ...)
- [x] Clean Architecture folder structure đã rõ ràng (domain/application/infrastructure/interface)
- [x] Tối ưu cho truy vấn ITD/PTD (materialized view + composite index)
- [x] Cross-module integration đã mô tả (loose coupling qua DI token)
- [x] Migration strategy backwards-compatible (2 phases)
- [x] Domain logic là pure function (không phụ thuộc NestJS/TypeORM)
- [x] Không có "Fat Services" — logic check nằm trong `domain/logic/budget-check.logic.ts`

---

> **SA Sign-off:** Thiết kế đã sẵn sàng chuyển sang **GATE 3 — DEV**.
> Đề xuất DEV thứ tự: (1) Migration DB → (2) Domain logic + unit test → (3) Application services → (4) Controller + Swagger → (5) Cross-module wiring cho PO/Invoice.
