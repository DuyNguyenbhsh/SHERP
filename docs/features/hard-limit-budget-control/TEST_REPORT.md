# TEST_REPORT: Hard Limit Budget Control

> **Feature:** Kiểm soát ngân sách cứng (Hard Limit)
> **Nguồn BA:** `docs/features/hard-limit-budget-control/BA_SPEC.md`
> **Nguồn SA:** `docs/features/hard-limit-budget-control/SA_DESIGN.md`
> **Ngày test:** 2026-04-11
> **Trạng thái:** Gate 4 — QA (Preliminary)

---

## 1. SCOPE

Feature này hiện đang ở trạng thái **Phase 1 Co-existence** — logic `checkBudgetLimit()` đã có trong `projects.service.ts` nhưng chưa tách thành module `budgets/` riêng theo SA_DESIGN.

| Thành phần | Vị trí hiện tại | Test file |
|---|---|---|
| `checkBudgetLimit()` (tạm thời) | `src/projects/projects.service.ts:986` | ❌ **CHƯA CÓ** |
| `calculateCostSummary()` (budget variance) | `src/projects/domain/logic/budget.logic.ts` | ❌ **CHƯA CÓ** |
| `BudgetPeriod` entity | Chưa có | N/A |
| `BudgetTransactionLog` entity | Chưa có | N/A |
| `BudgetRevision` entity | Chưa có | N/A |

---

## 2. TEST SCENARIOS BẮT BUỘC (Theo BA_SPEC)

### 2.1 BR-01: Công thức Hard Limit

- [ ] `checkHardLimit()` với `available = 10M, request = 5M` → APPROVED
- [ ] `checkHardLimit()` với `available = 10M, request = 10M` → APPROVED (bằng đúng, không vượt)
- [ ] `checkHardLimit()` với `available = 10M, request = 10.01M` → **REJECTED**
- [ ] `checkHardLimit()` với `control_level = ADVISORY, request vượt` → APPROVED + log warning
- [ ] `checkHardLimit()` với `control_level = SOFT, request vượt` → APPROVED + warning message
- [ ] `checkHardLimit()` với `control_level = HARD, request vượt` → REJECTED + rejection_reason

### 2.2 BR-02: Hạch toán kế toán

- [ ] PO Submit → sinh 2 GL entries: Debit ENCUMBRANCE / Credit BUDGETARY_CONTROL_RSRV
- [ ] AP Invoice Validate → 3 entries: Debit EXPENSE + Credit ENCUMBRANCE (release) + Credit AP
- [ ] Inventory Issue → 2 entries: Debit PROJECT_COST / Credit INVENTORY

### 2.3 BR-03: Phân cấp ngân sách

- [ ] Tạo budget Company-level = 1 tỷ → tạo child Department = 600 triệu → OK
- [ ] Tạo child Department = 1.2 tỷ → **REJECTED** (vượt parent)
- [ ] Roll-up: Consumed ở Task level tự động tăng ở Phase/Project/Department

### 2.4 BR-04: Budget Period Control

- [ ] Period 2026-Q1 có `period_amount = 100M`, đã consumed 80M → available Q1 = 20M
- [ ] Transaction Q1 = 25M → REJECTED (vượt period)
- [ ] `allow_carry_forward = false`: Q1 còn dư 20M → Q2 available KHÔNG tăng
- [ ] `allow_carry_forward = true`: Q1 dư 20M → Q2 available = Q2_period_amount + 20M

### 2.5 BR-05: Override Rules

- [ ] User thường submit override → 403 Forbidden
- [ ] CFO submit override → APPROVED, log vào `budget_transaction_logs` với `check_result = OVERRIDE`
- [ ] Override phải có `override_reason` (non-null) — thiếu → 400
- [ ] Sau override, giao dịch vẫn tính vào `consumed_amount`
- [ ] Override chỉ áp dụng cho 1 transaction, không thay đổi `period_amount`

### 2.6 Budget Revision (tách biệt Override)

- [ ] Submit revision tăng budget 10% → status = PENDING
- [ ] CFO approve → `project_budgets.total_amount` tăng, tạo log revision_number++
- [ ] CFO reject → không đổi amount, status = REJECTED

### 2.7 Báo cáo vượt ngân sách (US-05)

- [ ] GET `/api/budgets/violations?project_id=xxx&period=2026-Q1` → list REJECTED transactions
- [ ] Export Excel/PDF → file hợp lệ

---

## 3. UI COMPONENT CHECKLIST

| # | Component | Rendered? | Ghi chú |
|---|-----------|-----------|---------|
| 1 | `BudgetListPage` | ❌ | **CHƯA CÓ** — feature mới |
| 2 | `BudgetFormDialog` | ❌ | **CHƯA CÓ** |
| 3 | `BudgetPeriodAllocator` | ❌ | **CHƯA CÓ** |
| 4 | `BudgetUtilizationDashboard` | ❌ | **CHƯA CÓ** |
| 5 | `BudgetOverrideRequestForm` | ❌ | **CHƯA CÓ** |
| 6 | `BudgetViolationBanner` | ❌ | **CHƯA CÓ** |
| 7 | `BudgetRevisionWorkflow` | ❌ | **CHƯA CÓ** |

---

## 4. DATABASE STATE VERIFICATION

```sql
-- Kỳ vọng SAU khi chạy migration Phase 1:
SELECT COUNT(*) FROM project_budgets;           -- Phải có column control_level
SELECT COUNT(*) FROM budget_periods;             -- Bảng mới
SELECT COUNT(*) FROM budget_transaction_logs;    -- Bảng mới
SELECT COUNT(*) FROM budget_revisions;           -- Bảng mới
```

> **Chưa chạy migration** → tất cả bảng mới chưa tồn tại.

---

## 5. KẾT QUẢ CHẠY

```bash
npm run test -- --testPathPattern=budget
```

Output: **No tests found.** ❌

---

## 6. ĐÁNH GIÁ GATE 4

| Tiêu chí | Kết quả |
|---|---|
| Unit test cho `checkHardLimit()` | ❌ **FAIL** |
| Test hạch toán Nợ/Có | ❌ **FAIL** |
| Test Period rollup | ❌ **FAIL** |
| Test Override workflow | ❌ **FAIL** |
| UI components đầy đủ | ❌ **FAIL** (0/7) |
| Migration đã chạy | ❌ **FAIL** |

**Gate 4 Status: ❌ FAIL — NOT READY**

---

## 7. BLOCKER

Feature này **KHÔNG ĐƯỢC DEPLOY** vì:
1. Không có SA_DESIGN implementation tương ứng (vừa chỉ có doc, chưa code)
2. Logic hiện tại trong `projects.service.ts` chỉ check tổng, không hỗ trợ Period/Committed/Consumed
3. Không có test cho logic tài chính cốt lõi (vi phạm rule test: "Coverage cho hàm tính toán tài chính phải 100%")

---

## 8. ROADMAP GATE 3 → 4 → 5

**Sprint N (hiện tại):**
- [x] SA_DESIGN.md
- [ ] Migration file `AddBudgetaryControl`
- [ ] Domain logic + unit test (`budget-check.logic.spec.ts`)

**Sprint N+1:**
- [ ] Application services (`BudgetCheckService`, `BudgetOverrideService`)
- [ ] Controllers + Swagger
- [ ] Integration test với PO module

**Sprint N+2:**
- [ ] Frontend: 7 components ở mục 3
- [ ] E2E test
- [ ] Deploy Gate 5

---

> **QA Sign-off:** ❌ **REJECTED** — Feature chưa đủ điều kiện qua Gate 4. Cần hoàn thành ít nhất Sprint N trước khi review lại.
