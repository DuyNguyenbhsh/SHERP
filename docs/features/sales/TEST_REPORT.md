# TEST_REPORT: Module Sales (O2C)

> **Ngày:** 2026-04-16 · **Gate:** 4 — QA

## 1. Tổng quan kết quả

| Suite | Tests | Pass | Fail |
|-------|-------|------|------|
| `pricing.calculator.spec.ts` (pure) | 8 | 8 | 0 |
| `credit.checker.spec.ts` (pure) | 6 | 6 | 0 |
| `customers.service.spec.ts` | 10 | 10 | 0 |
| `sales-quote.service.spec.ts` | 11 | 11 | 0 |
| `sales-order.service.spec.ts` | 13 | 13 | 0 |
| **Sales total** | **48** | **48** | **0** |
| **Full backend suite** | **376** | **376** | **0** |

Time: ~24s full suite · Coverage domain logic 100%.

## 2. Business Rule verification

| BR | Scenario | Covered |
|----|----------|---------|
| BR-SALES-01 | `CUS/QT/SO-YYMMDD-XXX` auto-gen | ✅ create tests |
| BR-SALES-02 | Discount + Tax tính đúng thứ tự | ✅ pricing calculator (discount 10% + tax 10% → 1980) |
| BR-SALES-03 | VAT sau discount | ✅ pricing calculator spec |
| BR-SALES-04 | Quote EXPIRED qua cron | ⚠️ logic có (`markExpired`) — chưa wire cron job (Phase B) |
| BR-SALES-05 | SO cancel chỉ khi Outbound ≤ ALLOCATED | ✅ cancel() spec + block PICKING |
| BR-SALES-06 | Credit limit hard block + bypass | ✅ 3 test cases (block, bypass yêu cầu reason, bypass OK với reason) |
| BR-SALES-07 | SO DELIVERED → revenue log | ⚠️ chờ Finance module Phase B |
| BR-SALES-08 | Blacklist customer → chặn Quote/SO | ✅ `create()` ForbiddenException test |

## 3. Manual Verification (UI Gate 4)

Chưa thực hiện. Checklist cho QA:

- [ ] `/customers`: Tạo KH mới với tax_code → hiển thị mã CUS-YYMMDD-XXX
- [ ] `/customers`: Edit KH → update payment_term, credit_limit
- [ ] `/customers`: Soft delete + restore
- [ ] `/sales` tab Sales Orders: KPI cards hiển thị đúng 4 chỉ số
- [ ] `/sales` tab Quotes: Filter theo status, transition DRAFT → SENT → ACCEPTED
- [ ] `/sales` Create SO: chọn KH → hiển thị hạn mức + công nợ
- [ ] Create SO: vượt hạn mức → UI báo warning + hiện field bypass_reason
- [ ] Sau khi tạo SO: toast hiển thị cả SO_number + OB_number (Outbound auto-create)
- [ ] Cancel SO khi Outbound PENDING → PASS; khi PICKING → FAIL message
- [ ] Sidebar: nhóm "Bán hàng (O2C)" hiển thị 2 item Khách hàng + Báo giá & Đơn bán

## 4. Kết luận

✅ **Gate 4 PASS về code & unit test**. Cần QA chạy manual UI test theo checklist §3 trước deploy.
