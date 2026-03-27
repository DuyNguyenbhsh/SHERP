# CROSS-GATE QUALITY AUDIT REPORT

> **Feature:** Hard Limit Budget Control
> **Auditor:** Senior Lead Auditor
> **Ngày audit:** 2026-03-26
> **Phạm vi:** Toàn bộ 5 Gates

---

## BẢNG TỔNG KẾT

| Gate | Trạng thái | Nhận xét của Auditor |
|:-----|:-----------|:---------------------|
| **BA** | ✅ Pass | BA_SPEC.md đầy đủ: 5 User Stories, 5 Business Rules, hạch toán Nợ/Có, KPIs, CPI formula |
| **SA** | ❌ Fail | Chưa có file SA_DESIGN.md — chưa thiết kế ERD, API Endpoints, DTOs, folder structure |
| **DEV** | ❌ Fail | Code hiện tại chỉ có Budget Variance (báo cáo), chưa có Hard Limit checking logic |
| **TEST** | ❌ Fail | Không có file .spec.ts nào cho budget logic |
| **DEPLOY** | ⏸ Hold | Chưa thể đánh giá — phụ thuộc vào Gate 2-4 hoàn thành |

---

## CHI TIẾT TỪNG GATE

### 🚩 GATE 1: BA — ✅ PASS

**File reviewed:** `docs/features/hard-limit-budget-control/BA_SPEC.md`

| Tiêu chí | Kết quả | Chi tiết |
|----------|---------|----------|
| User Stories đầy đủ | ✅ | 5 stories: Setup, Auto-check, ITD/PTD, Override, Report |
| Business Rules rõ ràng | ✅ | BR-01→05: Công thức check, hạch toán Nợ/Có, Hierarchy, Period Control, Override Rules |
| Hạch toán Nợ/Có | ✅ | 3 loại: PO (Encumbrance↔Reserve), Invoice (Expense↔Encumbrance↔AP), WMS (ProjectCost↔Inventory) |
| KPI fields | ✅ | 8 metrics: Utilization%, Available, Rejection Rate, Override Rate, Variance, CPI, Burn Rate, Forecast |
| CPI/SPI formula | ✅ | CPI = Earned Value / Actual Cost |
| Luồng nghiệp vụ | ✅ | Flow diagram đầy đủ: Create → Check → Approve/Reject → Override |
| Data fields | ✅ | 4 bảng: Budget Master (20), Budget Period (9), Transaction Log (16), Revision (11) |
| Ảnh hưởng Financials | ✅ | Đánh giá impact lên 7 modules |

**Nhận xét:** BA_SPEC đạt chuẩn Oracle Fusion Cloud Budgetary Control. Đủ điều kiện chuyển Gate 2.

---

### 🚩 GATE 2: SA — ❌ FAIL

**Lý do:** Chưa có file `SA_DESIGN.md`.

**Phát hiện từ code hiện tại:**

| Thành phần | Hiện trạng | Gap so với BA_SPEC |
|-----------|------------|-------------------|
| `project-budget.entity.ts` | Chỉ có: id, project_id, category_id, planned_amount, currency, notes | **THIẾU 14 fields:** budget_code, fiscal_year, budget_type, control_level, total_amount, status, allow_carry_forward, warning_threshold_pct, department_id, wbs_element_id, cost_category, approved_by, approved_date, timestamps |
| `budget.logic.ts` | Chỉ tính variance (actual vs planned) | **THIẾU:** checkBudgetLimit(), validateBudgetHierarchy(), checkPeriodLimit() |
| `budget.types.ts` | Chỉ có BudgetRow, ActualCostRow, CostSummaryResult | **THIẾU:** BudgetCheckRequest, BudgetCheckResult, BudgetPeriod, BudgetTransactionLog, BudgetRevision |
| Budget Period table | **KHÔNG TỒN TẠI** | Cần tạo mới hoàn toàn |
| Budget Transaction Log table | **KHÔNG TỒN TẠI** | Cần tạo mới hoàn toàn |
| Budget Revision table | **KHÔNG TỒN TẠI** | Cần tạo mới hoàn toàn |
| Monthly Budget Variance View | Tồn tại — tính variance theo tháng | OK, có thể mở rộng thêm ITD/PTD |

**Yêu cầu SA phải thiết kế:**
1. ERD cho 4 bảng (mở rộng Budget Master + 3 bảng mới)
2. API Endpoints: CRUD Budget, checkBudgetLimit, Override flow, Reports
3. Domain interfaces & DTOs
4. Clean Architecture folder structure cho budget module
5. Tối ưu index cho truy vấn ITD/PTD

---

### 🚩 GATE 3: DEV — ❌ FAIL

**Lý do:** Chặn bởi Gate 2 (SA chưa có).

**Phát hiện nghiêm trọng:**

| # | Vấn đề | Mức độ |
|---|--------|--------|
| 1 | `checkBudgetLimit()` **KHÔNG TỒN TẠI** trong toàn bộ codebase | 🔴 Critical |
| 2 | Không có ENUM `control_level` (HARD/SOFT/ADVISORY) trên entity | 🔴 Critical |
| 3 | Budget entity thiếu fields cốt lõi (status, fiscal_year, budget_type) | 🔴 Critical |
| 4 | Không có transaction interception tại PO/Invoice/WMS/Timesheet | 🟡 Major |
| 5 | Không có Budget Override flow (approval + logging) | 🟡 Major |
| 6 | Budget Variance view chỉ track project-level, chưa có WBS/Period drill-down | 🟡 Major |

**Đối chiếu với CLAUDE.md rule:**
> "Budgetary Control: Mọi transaction tài chính/WMS phải gọi `BudgetService.checkBudgetLimit()`"

→ **Vi phạm rule:** Hiện tại KHÔNG CÓ hàm này trong codebase.

---

### 🚩 GATE 4: TEST — ❌ FAIL

**Lý do:** Không tồn tại file test nào cho budget logic.

| Yêu cầu test | Trạng thái |
|--------------|-----------|
| Unit test cho `calculateCostSummary()` | ❌ Không có |
| Unit test cho `checkBudgetLimit()` | ❌ Hàm chưa tồn tại |
| Test "vượt ngân sách" → REJECT | ❌ Không có |
| Test "trễ tiến độ đường găng" | ❌ Không có |
| Coverage hàm tài chính = 100% | ❌ 0% (chưa có test) |
| Integration test Override flow | ❌ Không có |

---

### 🚩 GATE 5: DEPLOY — ⏸ HOLD

**Lý do:** Phụ thuộc Gate 2-4.

**Dự kiến khi sẵn sàng:**
- [ ] Migration thêm columns vào `project_budgets` (mở rộng entity)
- [ ] Migration tạo 3 bảng mới: budget_periods, budget_transaction_logs, budget_revisions
- [ ] Migration cập nhật view `v_monthly_project_budget_variance`
- [ ] Env mới: BUDGET_WARNING_THRESHOLD_PCT (default: 90)
- [ ] Privilege mới: MANAGE_BUDGET, APPROVE_BUDGET_OVERRIDE, VIEW_BUDGET_REPORT
- [ ] Frontend sync: Budget dashboard, Override approval UI, Rejection report

---

## KẾT LUẬN CUỐI CÙNG

### ❌ YÊU CẦU SỬA ĐỔI TẠI GATE 2 (SA)

**Lý do:** Feature Hard Limit Budget Control hiện chỉ hoàn thành Gate 1 (BA). Cần SA thiết kế trước khi DEV có thể triển khai.

**Thứ tự hành động đề xuất:**

```
1. [SA]   → Thiết kế SA_DESIGN.md (ERD + API + DTOs + Folder)
2. [DEV]  → Mở rộng entity + tạo 3 bảng mới + implement checkBudgetLimit()
3. [DEV]  → Hook checkBudgetLimit() vào 7 transaction types
4. [DEV]  → Implement Override approval flow
5. [TEST] → Unit test + Hard Limit edge cases + 100% coverage
6. [DEPLOY] → Migration + Env + Frontend sync
```
