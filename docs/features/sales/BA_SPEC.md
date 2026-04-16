# BA_SPEC: Module Sales (Order-to-Cash — O2C)

> **Ngày tạo:** 2026-04-16
> **Trạng thái:** Gate 1 — BA
> **Stakeholder:** Phòng Kinh doanh, Kế toán AR, Quản lý kho
> **Phase:** MVP (chưa tích hợp AR/GL — link sau khi có Finance module)

---

## 1. BỐI CẢNH NGHIỆP VỤ

SH-GROUP hiện bán hàng qua Outbound (xuất kho) trực tiếp — thiếu bước **Sales Order** chính thức ràng buộc khách hàng, giá, điều khoản thanh toán. Hậu quả:
- Không theo dõi được Quotation (báo giá) → tỉ lệ chốt đơn
- Thiếu Credit Limit → có thể bán cho khách quá công nợ
- Discount/Tax tính tay, sai sót khi Invoice
- Không có cơ sở tính Revenue trước khi giao hàng

Module **Sales** chuẩn hóa luồng **Order-to-Cash (O2C)**: Quotation → Sales Order → Fulfillment (Outbound đã có) → Invoice (Finance — Phase B).

---

## 2. USER STORIES

### US-SALES-01: Quản lý Khách hàng (Customer Master)
> **As a** Sales Ops, **I want to** tạo/sửa khách hàng với thông tin pháp nhân + điều khoản, **So that** mọi đơn hàng đều có khách hàng đã khai báo chính thức.

**Acceptance:**
- Tạo Customer với `customer_code` (auto `CUS-YYMMDD-XXX`), `name`, `tax_code`, `customer_type`, `credit_limit`, `payment_term`
- Soft delete (`is_active = false`), không hard delete
- Search theo code/name/tax_code

---

### US-SALES-02: Tạo Báo giá (Quotation)
> **As a** Sales Rep, **I want to** tạo báo giá gửi khách hàng với dòng hàng + chiết khấu + VAT, **So that** khách hàng có cơ sở ký duyệt trước khi đặt hàng.

**Acceptance:**
- Auto `quote_number: QT-YYMMDD-XXX`
- Link Customer + effective_date + expiry_date
- Lines: product_id, qty, unit_price, discount_percent, tax_percent
- Auto-calc: `line_subtotal = qty * unit_price`, `line_discount = subtotal * discount%`, `line_tax = (subtotal - discount) * tax%`, `line_total = subtotal - discount + tax`
- Quote header auto tính `total_subtotal`, `total_discount`, `total_tax`, `grand_total`
- Status: `DRAFT → SENT → ACCEPTED / REJECTED / EXPIRED`

---

### US-SALES-03: Convert Quote → Sales Order
> **As a** Sales Rep, **I want to** convert Quote đã được khách accept thành Sales Order, **So that** kho có lệnh chính thức để pick/pack.

**Acceptance:**
- Chỉ Quote `ACCEPTED` mới convert được
- Copy toàn bộ lines + customer + discount/tax vào SO
- SO auto `order_number: SO-YYMMDD-XXX`
- Status SO khởi tạo: `CONFIRMED`
- Mỗi Quote convert tối đa 1 SO (tránh duplicate revenue)
- Kiểm tra Credit Limit TRƯỚC KHI confirm

---

### US-SALES-04: Credit Limit Check (Hard Limit)
> **As a** Finance Manager, **I want to** hệ thống chặn tạo SO nếu khách hàng vượt hạn mức công nợ, **So that** không phát sinh nợ xấu ngoài kiểm soát.

**Acceptance:**
- `Customer.credit_limit` vs tổng outstanding AR (sum `grand_total` của SO chưa thanh toán full)
- Nếu `outstanding + new_order > credit_limit` → block + message rõ số thiếu
- Bypass chỉ khi user có privilege `BYPASS_CREDIT_LIMIT`

---

### US-SALES-05: SO → Outbound Order Integration
> **As a** Warehouse Ops, **I want to** Sales Order tự động tạo Outbound Order để kho pick hàng, **So that** không cần re-enter data.

**Acceptance:**
- Khi SO confirm, tự tạo `OutboundOrder` status `PENDING` với `order_type = SALES_ORDER`, link `reference_code = SO.order_number`
- Copy customer_name/phone/address, lines (product_id, qty_requested)
- SO.status chuyển `FULFILLING` khi Outbound `PICKING`
- SO.status → `DELIVERED` khi Outbound `DELIVERED`
- Cancel SO → cancel Outbound (nếu chưa PICKED)

---

### US-SALES-06: Sales Dashboard & KPI
> **As a** Sales Manager, **I want to** xem KPI doanh số theo kỳ, **So that** đánh giá hiệu quả kinh doanh.

**Acceptance:**
- Tổng giá trị Quote (DRAFT + SENT) theo tháng/quý
- Tỷ lệ Quote → SO (win rate): `count(ACCEPTED) / count(SENT)`
- Revenue recognized: tổng SO `DELIVERED` theo kỳ
- Top 10 customers by revenue

---

## 3. BUSINESS RULES

| ID | Rule | Ràng buộc |
|----|------|----------|
| BR-SALES-01 | Auto-gen code pattern `CUS/QT/SO-YYMMDD-XXX` | Unique constraint, XXX reset theo ngày |
| BR-SALES-02 | `Quote.total_discount` tính trên tổng `line_subtotal`, KHÔNG overlap với `line_discount` | Chiết khấu header hoặc line — chọn 1 |
| BR-SALES-03 | VAT tính SAU discount: `tax = (subtotal - discount) * tax%` | Chuẩn hóa tiêu chuẩn kế toán VN |
| BR-SALES-04 | Quote `SENT` quá `expiry_date` → auto `EXPIRED` (cron daily) | Không accept được Quote hết hạn |
| BR-SALES-05 | SO chỉ cancel được khi Outbound `PENDING` hoặc `ALLOCATED` | Sau PICKING — phải Return Goods flow |
| BR-SALES-06 | Credit Limit Hard Block — override chỉ khi có privilege | Audit log mọi lần bypass |
| BR-SALES-07 | SO `DELIVERED` → tự sinh record `sales_revenue_log` (Phase B: Finance AR integration) | Source of truth cho Revenue R2R |
| BR-SALES-08 | `Customer.is_blacklisted = true` → KHÔNG tạo Quote/SO | Cảnh báo tại UI |

---

## 4. KPI & REPORT FIELDS

| KPI | Công thức | Nguồn |
|-----|----------|-------|
| Total Bookings | `SUM(SO.grand_total)` theo kỳ | `sales_orders` |
| Revenue Recognized | `SUM(SO.grand_total)` WHERE status = DELIVERED | `sales_orders` |
| Quote Win Rate | `COUNT(Quote.ACCEPTED) / COUNT(Quote.SENT) * 100%` | `sales_quotes` |
| Avg Order Value | `AVG(SO.grand_total)` | `sales_orders` |
| Outstanding AR | `SUM(SO.grand_total)` unpaid | SO + future AR payments |
| Top Customers | GROUP BY customer_id, ORDER BY SUM(grand_total) DESC | `sales_orders` |

---

## 5. ẢNH HƯỞNG TÀI CHÍNH & TUÂN THỦ

- **Revenue recognition:** SO `DELIVERED` là moment "earn" revenue — không phải lúc tạo SO
- **Tax compliance:** VAT 10% mặc định, có thể tuỳ chỉnh per line
- **AR integration** (Phase B): SO DELIVERED → tạo AR invoice → theo dõi thu tiền
- **Audit:** Mọi edit SO sau confirm phải log (tương tự Document Audit)

---

## 6. OUT OF SCOPE (Phase B)

- AR invoice generation (cần Finance module)
- Commission calculation (cần HRM payroll)
- Multi-currency pricing
- Sales forecasting (AI/ML)
- E-invoice integration (hóa đơn điện tử)

---

## 7. CHECKLIST HOÀN THÀNH GATE 1

- [x] 6 User Stories đầy đủ (Customer, Quote, Convert, CreditLimit, SO→Outbound, Dashboard)
- [x] 8 Business Rules rõ ràng (hạch toán, override privilege)
- [x] KPI fields định nghĩa (6 metrics)
- [x] Ảnh hưởng Finance/AR đã note
- [x] Out-of-scope Phase B rõ ràng
- [ ] Stakeholder review (chờ user approve)
