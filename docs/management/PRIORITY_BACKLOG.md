# SH-GROUP ERP — PRIORITY BACKLOG

> **Ngày tạo:** 2026-04-12
> **Nguồn:** Full-project review (Backend + Frontend + Docs + DevOps)
> **Trạng thái hiện tại:** Phase 1 DONE (2026-03-27) → Phase 2 (Project & Budget) đang triển khai
> **Cập nhật lần cuối:** 2026-04-12 — Phase 2A DONE + Phase 2B 90%

---

## Tổng quan Phase

```
Phase 1 (Foundation)  ████████████████████ DONE 2026-03-27
Phase 2A (Financial Control + Data Safety)  ████████████████████ DONE 2026-04-12
Phase 2B (FE Refactor + Docs Catchup)       ██████████████████░░ 90% (còn #8 BA/SA docs + 2 giant components)
Phase 3 (WMS Full + TMS + Reports)          ░░░░░░░░░░░░░░░░░░░░
```

---

## PHASE 2A — Financial Control & Data Safety

> **Mục tiêu:** Đảm bảo Budgetary Control đúng quy tắc CLAUDE.md, dữ liệu ACID, script an toàn.
> **Ưu tiên:** Phải xong trước khi đưa bất kỳ module tài chính/WMS nào lên production.

### P0 — CRITICAL (phải sửa ngay)

| # | Task | Owner | Effort | Depends on | Gate |
|---|------|-------|--------|------------|------|
| 1 | ✅ **Implement `checkBudgetLimit()` cho WMS ops** — Hook vào outbound.create() + procurement.createPO() với budget audit log. Inbound bỏ qua (cost đã committed ở PO). | Backend | M | — | Gate 3 |
| 2 | ✅ **Migrate 3 bảng budget + mở rộng entity** — `budget_periods`, `budget_transaction_logs`, `budget_revisions` + 14 fields mới cho `project_budgets` + columns cho outbound/procurement | Backend | M | — | Gate 3+5 |
| 3 | ✅ (gộp vào #2) | — | — | — | — |
| 4 | ✅ **`db-clean.mjs`: Thêm interactive confirm + auto-backup** — Prompt xác nhận + tự gọi db-backup.sh trước khi xóa | DevOps | S | — | Gate 5 |

### P1 — HIGH (tuần này)

| # | Task | Owner | Effort | Depends on | Gate |
|---|------|-------|--------|------------|------|
| 5 | ✅ **Wrap `inventory.adjust()` trong `DataSource.transaction()`** — `transfer()` đã có sẵn transaction. Chỉ `adjust()` thiếu → đã sửa | Backend | S | — | Gate 3 |
| 6 | ✅ **Xóa dead code `axiosClient.ts`** — File không có import nào sử dụng (dead code). Đã xóa file + thư mục `src/api/` | Frontend | S | — | Gate 3 |
| 7 | ✅ **Xóa `console.log` URLs production** — `shared/api/axios.ts:12-13` đã xóa | Frontend | XS | — | Gate 3 |

---

## PHASE 2B — Frontend Refactor & Docs Catchup

> **Mục tiêu:** Giảm nợ kỹ thuật FE, bổ sung tài liệu Gate 1+2 bị thiếu, tạo ERD tổng thể.
> **Có thể làm song song** với Phase 2A (không phụ thuộc lẫn nhau trừ #8).

### P1 — HIGH

| # | Task | Owner | Effort | Depends on | Gate |
|---|------|-------|--------|------------|------|
| 8 | **Viết BA_SPEC + SA_DESIGN cho các module thiếu** — backlog dài hạn, cần session riêng | Docs | L | — | Gate 1+2 |
| 9 | ✅ **Tạo Master ERD diagram** — `docs/diagrams/database-erd.md` với 69 entities, 9 domains, Oracle Standard chain | Docs | M | — | Gate 2 |

### P2 — MEDIUM

| # | Task | Owner | Effort | Depends on | Gate |
|---|------|-------|--------|------------|------|
| 10 | ✅ **Refactor ProjectDetailPage.tsx** — 1231→193 dòng, tách 8 subcomponents. OrgChartTab + ProjectRequestsPage chưa refactor | Frontend | L | — | Gate 3 |
| 11 | ✅ **Lazy-load routes + code splitting** — 24 pages dùng `React.lazy()` + `Suspense` + `PageLoader` spinner | Frontend | M | — | Gate 3 |
| 12 | ✅ **Fix `key={idx}` anti-pattern** — 6 chỗ sửa trong 4 files (ImportModal, GanttTab, ProjectRequestsPage, WorkflowConfigPage) | Frontend | S | — | Gate 3 |
| 13 | ✅ **Fix type safety backend** — Shared `AuthenticatedRequest` type, fix 26 `req: any` trong 8 controllers + 7 `catch (err: any)` → `unknown` | Backend | S | — | Gate 3 |
| 14 | ✅ **Thêm audit logger cho giao dịch tài chính** — Logger trong 5 services (6 methods): putaway, pickItem, adjust, transfer, receiveGoods, createTransaction | Backend | S | — | Gate 3 |

### P3 — LOW (backlog dài hạn)

| # | Task | Owner | Effort | Depends on | Gate |
|---|------|-------|--------|------------|------|
| 15 | **Config ThrottlerGuard per route** — Đã import `ThrottlerModule` nhưng chưa binding per-endpoint | Backend | S | — | Gate 3 |
| 16 | **Cân nhắc chuyển token sang httpOnly cookie** — Hiện lưu localStorage qua Zustand persist → XSS risk | Frontend + Backend | L | — | Gate 2+3 |
| 17 | **Hoàn thiện unit tests (Gate 4)** — 7 `.spec.ts` còn `TODO (Gate 4)`. Coverage cho financial logic phải 100% theo test-rules | Backend | L | #1, #2 (logic phải xong mới test) | Gate 4 |
| 18 | **i18n framework** — 100% tiếng Việt hardcode hiện tại. Nếu cần hỗ trợ EN → thêm `react-i18next` | Frontend | L | — | Gate 3 |
| 19 | **Thêm service Postgres local vào docker-compose.yml** — Hiện chỉ dùng NeonDB cloud, dev offline không được | DevOps | S | — | Gate 5 |

---

## Dependency Graph

```
#8 (BA/SA docs) ──┐
                   ├──► #2 (migrate budget tables) ──► #3 (budget fields) ──► #1 (checkBudgetLimit WMS)
#9 (ERD diagram) ──┘                                                              │
                                                                                   ▼
                                                                          #17 (unit tests budget)
                                                                          #14 (audit logger)

#6 (gộp axios) ──► #7 (xóa console.log)

#4 (db-clean safety)     ← độc lập, làm ngay
#5 (transaction wrap)    ← độc lập, làm ngay
#10 (refactor components) ← độc lập
#11 (lazy routes)         ← độc lập
#12 (fix key={idx})       ← độc lập
#13 (type safety)         ← độc lập
```

---

## Effort Legend

| Size | Ước lượng | Ví dụ |
|------|-----------|-------|
| XS | < 30 phút | Xóa console.log, fix 1 import |
| S | 1–3 giờ | Wrap transaction, fix keys, gộp axios |
| M | 3–8 giờ | Migrate tables, tạo ERD, lazy routes |
| L | 1–3 ngày | Viết BA/SA nhiều module, refactor 3 giant components, i18n |

---

## Cách dùng file này

1. **Trước khi bắt task mới** → kiểm tra task đó thuộc Phase/Priority nào
2. **Khi xong 1 task** → đánh dấu ✅ ở cột #, ghi ngày hoàn thành
3. **Review hàng tuần** → cập nhật trạng thái, thêm task phát sinh
4. **Quy tắc 5-Gate vẫn áp dụng** → task có "Depends on" phải xong trước mới được bắt đầu

---

*File này được tạo từ kết quả review toàn dự án ngày 2026-04-12.*
