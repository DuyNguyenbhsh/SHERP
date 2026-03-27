# BA_SPEC: Hard Limit Budget Control

> **Feature:** Kiểm soát ngân sách cứng (Hard Limit) cho mọi giao dịch tài chính & WMS
> **Chuẩn tham chiếu:** Oracle Fusion Cloud — Budgetary Control Module
> **Ngày tạo:** 2026-03-26
> **Trạng thái:** GATE 1 — BA ANALYSIS

---

## 1. Bối cảnh nghiệp vụ (Business Context)

Trong Oracle Fusion Cloud, **Budgetary Control** là cơ chế kiểm soát chi tiêu theo ngân sách đã được phê duyệt. Có 3 mức kiểm soát:

| Loại | Hành vi | Khi vượt ngân sách |
|------|---------|---------------------|
| **Hard Limit** | Chặn tuyệt đối | Transaction bị REJECT, không cho phép thực hiện |
| Soft Limit | Cảnh báo | Transaction được WARNING nhưng vẫn cho thực hiện |
| Advisory | Theo dõi | Chỉ ghi nhận, không có hành động |

**Phạm vi feature này:** Chỉ tập trung vào **Hard Limit** — mức kiểm soát nghiêm ngặt nhất.

---

## 2. User Stories

### US-01: Thiết lập ngân sách với Hard Limit
> **As a** Financial Controller,
> **I want to** thiết lập ngân sách cho từng Project/Department với mức kiểm soát Hard Limit,
> **So that** mọi chi tiêu vượt ngân sách đều bị chặn tự động.

**Acceptance Criteria:**
- Có thể tạo Budget cho Project, Department, hoặc Cost Center
- Chọn Budget Control Level: Hard / Soft / Advisory
- Phân bổ ngân sách theo Period (tháng/quý/năm)
- Ngân sách phải liên kết với WBS Element (nếu là Project Budget)

### US-02: Kiểm tra ngân sách khi tạo giao dịch
> **As a** System,
> **I want to** tự động kiểm tra ngân sách khả dụng trước khi cho phép giao dịch,
> **So that** không có giao dịch nào vượt quá Hard Limit.

**Acceptance Criteria:**
- Kiểm tra tại thời điểm tạo: Purchase Order, AP Invoice, GL Journal, Inventory Issue, Timesheet
- So sánh: `Consumed Amount + Transaction Amount <= Budget Amount`
- Nếu vượt → REJECT với message rõ ràng
- Nếu đủ → APPROVE và cập nhật Consumed Amount

### US-03: Theo dõi ngân sách theo ITD và PTD
> **As a** Project Manager,
> **I want to** xem ngân sách đã sử dụng theo ITD (Inception to Date) và PTD (Period to Date),
> **So that** tôi có cái nhìn tổng quan và chi tiết về tình hình chi tiêu.

**Acceptance Criteria:**
- ITD: Tổng chi tiêu từ đầu dự án đến hiện tại
- PTD: Chi tiêu trong kỳ hiện tại (tháng/quý)
- Hiển thị: Budget Amount, Consumed, Committed (PO chưa invoice), Available
- Cảnh báo khi Available < 10% (threshold cấu hình được)

### US-04: Phê duyệt ngoại lệ (Budget Override)
> **As a** CFO / Finance Director,
> **I want to** có quyền phê duyệt ngoại lệ cho giao dịch vượt Hard Limit,
> **So that** các trường hợp đặc biệt vẫn có thể xử lý mà không phá vỡ quy trình.

**Acceptance Criteria:**
- Chỉ role CFO/Finance Director mới có quyền Override
- Phải ghi lý do Override
- Giao dịch Override được đánh dấu đặc biệt để audit
- Gửi notification cho các stakeholder liên quan

### US-05: Báo cáo vượt ngân sách
> **As a** Financial Controller,
> **I want to** xem báo cáo tất cả các giao dịch bị chặn bởi Hard Limit,
> **So that** tôi có thể phân tích nguyên nhân và đề xuất điều chỉnh ngân sách.

**Acceptance Criteria:**
- Danh sách giao dịch bị REJECT kèm: ngày, người tạo, số tiền, ngân sách còn lại
- Lọc theo: Project, Department, Period, User
- Export được ra Excel/PDF

---

## 3. Business Rules

### BR-01: Công thức kiểm tra Hard Limit
```
Available Budget = Budget Amount - (Consumed Amount + Committed Amount)

IF Transaction Amount > Available Budget
   THEN → REJECT transaction
   AND  → Log vào Budget Violation History
   AND  → Notify Budget Owner

IF Transaction Amount <= Available Budget
   THEN → APPROVE transaction
   AND  → UPDATE Consumed Amount += Transaction Amount
```

### BR-02: Quy tắc hạch toán kế toán (Nợ/Có)

#### Khi tạo Purchase Order (Committed):
| Tài khoản | Nợ (Debit) | Có (Credit) |
|-----------|------------|-------------|
| Encumbrance (Cam kết chi) | X | |
| Budgetary Control Reserve | | X |

#### Khi nhận Invoice (Consumed — chuyển từ Committed sang Actual):
| Tài khoản | Nợ (Debit) | Có (Credit) |
|-----------|------------|-------------|
| Chi phí thực tế (Expense) | X | |
| Encumbrance (Giải phóng cam kết) | | X |
| Phải trả nhà cung cấp (AP) | | X |

#### Khi xuất kho (WMS — Consumed trực tiếp):
| Tài khoản | Nợ (Debit) | Có (Credit) |
|-----------|------------|-------------|
| Chi phí vật tư dự án (Project Cost) | X | |
| Hàng tồn kho (Inventory) | | X |

### BR-03: Phân cấp ngân sách (Budget Hierarchy)
```
Company
  └── Department
        └── Project
              └── WBS Level 1 (Phase)
                    └── WBS Level 2 (Task Group)
                          └── WBS Level 3 (Task)
                                └── Cost Category (Labor / Material / Subcontract / Overhead)
```
- Ngân sách con không được vượt ngân sách cha
- Roll-up tự động từ Task → Phase → Project → Department

### BR-04: Budget Period Control
- Fiscal Year chia thành 12 periods (hoặc custom)
- Hard Limit kiểm tra ở 2 cấp:
  - **Period Level:** Không vượt ngân sách kỳ hiện tại
  - **ITD Level:** Không vượt tổng ngân sách cả dự án
- Ngân sách chưa dùng hết ở Period trước **KHÔNG** tự động chuyển sang Period sau (trừ khi cấu hình Allow Carry Forward = true)

### BR-05: Budget Override Rules
- Override chỉ áp dụng cho **1 giao dịch cụ thể**, không phải tăng ngân sách
- Override phải có: Reason, Approver, Timestamp
- Giao dịch Override vẫn tính vào Consumed Amount
- Nếu cần tăng ngân sách thật → phải dùng luồng Budget Revision (feature riêng)

---

## 4. Các loại giao dịch bị kiểm soát (Controlled Transactions)

| # | Transaction Type | Module | Thời điểm check |
|---|-----------------|--------|-----------------|
| 1 | Purchase Order | Procurement | Khi Submit PO |
| 2 | AP Invoice | Accounts Payable | Khi Validate Invoice |
| 3 | GL Journal | General Ledger | Khi Post Journal |
| 4 | Inventory Issue | WMS | Khi Confirm Issue |
| 5 | Timesheet | HRM/Project | Khi Approve Timesheet |
| 6 | Expense Report | Expense | Khi Submit Report |
| 7 | Subcontract Payment | Project | Khi Approve Payment |

---

## 5. Trường dữ liệu cần thiết (Data Fields)

### 5.1 Budget Master (Bảng ngân sách chính)
| Field | Type | Mô tả | Bắt buộc |
|-------|------|--------|----------|
| `budget_id` | UUID | Primary key | Yes |
| `budget_code` | VARCHAR(50) | Mã ngân sách (unique) | Yes |
| `budget_name` | VARCHAR(255) | Tên ngân sách | Yes |
| `fiscal_year` | INT | Năm tài chính | Yes |
| `budget_type` | ENUM | CAPEX / OPEX | Yes |
| `control_level` | ENUM | HARD / SOFT / ADVISORY | Yes |
| `total_amount` | DECIMAL(18,2) | Tổng ngân sách | Yes |
| `currency_code` | VARCHAR(3) | Đơn vị tiền tệ | Yes |
| `status` | ENUM | DRAFT / APPROVED / CLOSED / REVISED | Yes |
| `allow_carry_forward` | BOOLEAN | Cho phép chuyển dư sang kỳ sau | Yes |
| `warning_threshold_pct` | INT | % cảnh báo (default 90) | Yes |
| `company_id` | FK | Liên kết Company | Yes |
| `department_id` | FK | Liên kết Department | No |
| `project_id` | FK | Liên kết Project | No |
| `wbs_element_id` | FK | Liên kết WBS Element | No |
| `cost_category` | ENUM | LABOR / MATERIAL / SUBCONTRACT / OVERHEAD / ALL | Yes |
| `approved_by` | FK | Người phê duyệt | No |
| `approved_date` | DATETIME | Ngày phê duyệt | No |
| `created_by` | FK | Người tạo | Yes |
| `created_at` | DATETIME | Ngày tạo | Yes |
| `updated_at` | DATETIME | Ngày cập nhật | Yes |

### 5.2 Budget Period (Phân bổ theo kỳ)
| Field | Type | Mô tả | Bắt buộc |
|-------|------|--------|----------|
| `budget_period_id` | UUID | Primary key | Yes |
| `budget_id` | FK | Liên kết Budget Master | Yes |
| `period_name` | VARCHAR(20) | Ví dụ: "2026-Q1", "2026-03" | Yes |
| `period_start` | DATE | Ngày bắt đầu kỳ | Yes |
| `period_end` | DATE | Ngày kết thúc kỳ | Yes |
| `period_amount` | DECIMAL(18,2) | Ngân sách kỳ | Yes |
| `consumed_amount` | DECIMAL(18,2) | Đã tiêu thực tế | Yes |
| `committed_amount` | DECIMAL(18,2) | Đã cam kết (PO chưa invoice) | Yes |
| `available_amount` | DECIMAL(18,2) | = period_amount - consumed - committed | Yes (computed) |

### 5.3 Budget Transaction Log (Lịch sử giao dịch)
| Field | Type | Mô tả | Bắt buộc |
|-------|------|--------|----------|
| `log_id` | UUID | Primary key | Yes |
| `budget_id` | FK | Liên kết Budget | Yes |
| `budget_period_id` | FK | Liên kết Period | Yes |
| `transaction_type` | ENUM | PO / AP_INVOICE / GL_JOURNAL / INVENTORY_ISSUE / TIMESHEET / EXPENSE / SUBCONTRACT | Yes |
| `transaction_id` | UUID | ID giao dịch gốc | Yes |
| `transaction_ref` | VARCHAR(100) | Mã tham chiếu giao dịch | Yes |
| `amount` | DECIMAL(18,2) | Số tiền giao dịch | Yes |
| `amount_type` | ENUM | COMMITTED / CONSUMED | Yes |
| `check_result` | ENUM | APPROVED / REJECTED / OVERRIDE | Yes |
| `available_before` | DECIMAL(18,2) | Ngân sách khả dụng trước giao dịch | Yes |
| `available_after` | DECIMAL(18,2) | Ngân sách khả dụng sau giao dịch | Yes |
| `rejection_reason` | TEXT | Lý do chặn (nếu REJECTED) | No |
| `override_by` | FK | Người phê duyệt ngoại lệ | No |
| `override_reason` | TEXT | Lý do Override | No |
| `created_by` | FK | Người tạo giao dịch | Yes |
| `created_at` | DATETIME | Timestamp | Yes |

### 5.4 Budget Revision (Điều chỉnh ngân sách)
| Field | Type | Mô tả | Bắt buộc |
|-------|------|--------|----------|
| `revision_id` | UUID | Primary key | Yes |
| `budget_id` | FK | Liên kết Budget | Yes |
| `revision_number` | INT | Số lần điều chỉnh | Yes |
| `previous_amount` | DECIMAL(18,2) | Ngân sách trước điều chỉnh | Yes |
| `revised_amount` | DECIMAL(18,2) | Ngân sách sau điều chỉnh | Yes |
| `adjustment_amount` | DECIMAL(18,2) | = revised - previous | Yes |
| `reason` | TEXT | Lý do điều chỉnh | Yes |
| `requested_by` | FK | Người yêu cầu | Yes |
| `approved_by` | FK | Người phê duyệt | No |
| `status` | ENUM | PENDING / APPROVED / REJECTED | Yes |
| `created_at` | DATETIME | Timestamp | Yes |

---

## 6. KPIs & Metrics cho Dashboard

| KPI | Công thức | Mô tả |
|-----|-----------|--------|
| **Budget Utilization %** | `(Consumed + Committed) / Budget Amount × 100` | % ngân sách đã sử dụng |
| **Available Budget** | `Budget Amount - Consumed - Committed` | Ngân sách còn khả dụng |
| **Rejection Rate** | `Rejected Transactions / Total Transactions × 100` | Tỷ lệ giao dịch bị chặn |
| **Override Rate** | `Override Transactions / Rejected Transactions × 100` | Tỷ lệ ngoại lệ |
| **Budget Variance** | `Budget Amount - Consumed (Actual)` | Chênh lệch ngân sách |
| **CPI (Cost Performance Index)** | `Earned Value / Consumed (Actual Cost)` | Hiệu suất chi phí (>1 = tốt) |
| **Burn Rate** | `Consumed Amount / Số kỳ đã qua` | Tốc độ tiêu ngân sách/kỳ |
| **Forecast at Completion** | `Consumed + (Remaining Work / CPI)` | Dự báo chi phí hoàn thành |

---

## 7. Luồng nghiệp vụ chính (Business Flow)

```
[User tạo Transaction]
        │
        ▼
[System xác định Budget liên quan]
  (theo Project → WBS → Cost Category → Period)
        │
        ▼
[Gọi checkBudgetLimit()]
        │
        ├── Available >= Transaction Amount
        │         │
        │         ▼
        │   [APPROVE]
        │   → Cập nhật Consumed/Committed
        │   → Ghi Budget Transaction Log
        │   → Hạch toán kế toán (Nợ/Có)
        │   → Cho phép tiếp tục transaction
        │
        └── Available < Transaction Amount
                  │
                  ▼
            [REJECT]
            → Ghi Budget Transaction Log (REJECTED)
            → Notify Budget Owner
            → Hiển thị message cho User:
              "Giao dịch bị chặn: Vượt ngân sách X đồng.
               Ngân sách khả dụng: Y đồng.
               Liên hệ CFO để phê duyệt ngoại lệ."
                  │
                  ▼
            [User yêu cầu Override?]
                  │
                  ├── Không → Kết thúc
                  └── Có → Gửi request đến CFO
                            │
                            ▼
                      [CFO Approve/Reject Override]
                            │
                            ├── Reject → Kết thúc
                            └── Approve → Ghi OVERRIDE log
                                        → Cập nhật Consumed
                                        → Cho phép transaction
```

---

## 8. Ảnh hưởng đến các Module khác

| Module | Ảnh hưởng |
|--------|-----------|
| **Procurement** | PO Submit phải qua budget check, Committed amount tăng |
| **Accounts Payable** | Invoice validate phải qua budget check, chuyển Committed → Consumed |
| **General Ledger** | Journal posting phải qua budget check, hạch toán Encumbrance |
| **WMS (Inventory)** | Material Issue phải qua budget check, Consumed tăng trực tiếp |
| **HRM** | Timesheet approve phải qua budget check (Labor cost) |
| **Project Management** | CPI/SPI tính từ Budget vs Actual, EVM dashboard |
| **Reporting** | Thêm các báo cáo Budget Utilization, Rejection, Override |

---

## 9. BA Checklist

- [x] User Stories đã liệt kê đầy đủ (5 stories)
- [x] Business Rules rõ ràng — hạch toán Nợ/Có cho PO, Invoice, WMS
- [x] KPI fields được xác định (8 metrics)
- [x] Ảnh hưởng đến Financials (Costing/Billing) đã được đánh giá
- [x] Công thức CPI đã rõ: `Earned Value / Actual Cost`
- [x] Luồng nghiệp vụ chính đã vẽ (Flow diagram)
- [x] Data fields đã liệt kê (4 bảng, đầy đủ type + constraint)

---

> **BA Sign-off:** Tài liệu đã sẵn sàng chuyển sang **GATE 2 — SA Design**.
> Đề xuất SA tập trung vào: ERD cho 4 bảng trên, API endpoints cho budget check, và Domain Logic cho `checkBudgetLimit()`.
