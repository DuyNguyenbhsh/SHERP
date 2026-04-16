# SA_DESIGN: Module Sales (O2C)

> **Ngày:** 2026-04-16 · **Gate:** 2 — SA · **Source BA:** `docs/features/sales/BA_SPEC.md`

---

## 1. ENTITY RELATIONSHIP DIAGRAM

```
Customer ──┬─< Quote ──< QuoteLine
           │      │
           │      └── converted_to ──> SalesOrder ──< SalesOrderLine
           │
           └─< SalesOrder ──< SalesOrderLine
                    │
                    └── fulfillment ──> OutboundOrder (existing)
```

### 1.1 Customer (`customers`)
| Column | Type | Ghi chú |
|--------|------|---------|
| id | uuid PK | |
| customer_code | varchar(50) unique | `CUS-YYMMDD-XXX` |
| name | varchar(255) | Tên pháp nhân |
| short_name | varchar(100) | Hiển thị UI |
| tax_code | varchar(50) unique nullable | MST |
| customer_type | enum | `INDIVIDUAL / CORPORATE / WHOLESALE / RETAIL` |
| primary_contact | varchar(255) | |
| primary_phone | varchar(50) | |
| primary_email | varchar(150) | |
| billing_address | text | |
| shipping_address | text | |
| payment_term | enum | `COD / NET15 / NET30 / EOM / PREPAY` |
| credit_limit | decimal(15,2) default 0 | Hạn mức công nợ |
| current_debt | decimal(15,2) default 0 | Công nợ hiện tại (denormalized, update khi SO confirmed/paid) |
| is_active | boolean default true | Soft delete |
| is_blacklisted | boolean default false | Chặn giao dịch |
| notes | text | |
| created_at / updated_at / version | — | Audit + optimistic locking |

**Index:** `(is_active, customer_type)`, unique `(customer_code)`, unique `(tax_code)`

### 1.2 Quote (`sales_quotes`)
| Column | Type | Ghi chú |
|--------|------|---------|
| id | uuid PK | |
| quote_number | varchar(50) unique | `QT-YYMMDD-XXX` |
| customer_id | uuid FK → customers | ON DELETE RESTRICT |
| status | enum | `DRAFT / SENT / ACCEPTED / REJECTED / EXPIRED` |
| effective_date | date | |
| expiry_date | date | |
| total_subtotal | decimal(15,2) | `SUM(line_subtotal)` |
| total_discount | decimal(15,2) | `SUM(line_discount)` |
| total_tax | decimal(15,2) | `SUM(line_tax)` |
| grand_total | decimal(15,2) | `subtotal - discount + tax` |
| converted_to_so_id | uuid nullable | FK → sales_orders (1-1) |
| sales_rep_id | uuid | FK → employees |
| notes | text | |
| created_at / updated_at | — | |

**Index:** `(customer_id, status)`, `(status, expiry_date)` — cho cron EXPIRED

### 1.3 QuoteLine (`sales_quote_lines`)
| Column | Type | Ghi chú |
|--------|------|---------|
| id | uuid PK | |
| quote_id | uuid FK → sales_quotes | ON DELETE CASCADE |
| product_id | uuid FK → products | |
| qty | int | |
| unit_price | decimal(12,2) | |
| discount_percent | decimal(5,2) default 0 | 0-100 |
| tax_percent | decimal(5,2) default 10 | VAT VN default 10% |
| line_subtotal | decimal(15,2) | computed: `qty * unit_price` |
| line_discount | decimal(15,2) | computed |
| line_tax | decimal(15,2) | computed |
| line_total | decimal(15,2) | computed |
| notes | text | |

### 1.4 SalesOrder (`sales_orders`)
| Column | Type | Ghi chú |
|--------|------|---------|
| id | uuid PK | |
| order_number | varchar(50) unique | `SO-YYMMDD-XXX` |
| customer_id | uuid FK → customers | |
| quote_id | uuid nullable | FK → sales_quotes (nguồn convert) |
| status | enum | `CONFIRMED / FULFILLING / DELIVERED / CANCELED` |
| outbound_order_id | uuid nullable | FK → outbound_orders (wire sau create) |
| order_date | timestamp default now | |
| required_delivery_date | date | |
| ship_to_address | text | |
| payment_term | enum | Snapshot từ customer lúc confirm |
| total_subtotal / total_discount / total_tax / grand_total | decimal | |
| is_credit_bypassed | boolean default false | True nếu BYPASS_CREDIT_LIMIT privilege |
| bypass_reason | text nullable | Nếu bypass → audit |
| sales_rep_id | uuid | |
| notes | text | |
| created_at / updated_at / version | — | |

**Index:** `(customer_id, status)`, `(status, order_date)`, unique `(order_number)`

### 1.5 SalesOrderLine (`sales_order_lines`)
Giống QuoteLine nhưng `FK sales_order_id`. Thêm: `qty_fulfilled int default 0` — track fulfillment từ Outbound.

---

## 2. API ENDPOINTS

### Customer (`/customers` — new module)
```
GET    /customers?is_active=&type=      → List + filter
GET    /customers/:id                   → Detail
POST   /customers                       → Create
PATCH  /customers/:id                   → Update
DELETE /customers/:id                   → Soft delete
PUT    /customers/:id/restore           → Restore
GET    /customers/:id/debt              → Current AR outstanding
```

### Sales Quote (`/sales/quotes`)
```
GET    /sales/quotes?status=&customer_id=
GET    /sales/quotes/:id
POST   /sales/quotes                    → Create DRAFT
PATCH  /sales/quotes/:id                → Update (chỉ khi DRAFT)
POST   /sales/quotes/:id/send           → DRAFT → SENT
POST   /sales/quotes/:id/accept         → SENT → ACCEPTED
POST   /sales/quotes/:id/reject         → SENT → REJECTED
POST   /sales/quotes/:id/convert        → Convert → SO (chỉ ACCEPTED)
DELETE /sales/quotes/:id                → Cancel (chỉ DRAFT)
```

### Sales Order (`/sales/orders`)
```
GET    /sales/orders?status=&customer_id=
GET    /sales/orders/:id
POST   /sales/orders                    → Create + credit check + auto-create Outbound
PATCH  /sales/orders/:id/cancel         → Cancel (chỉ PENDING/ALLOCATED)
GET    /sales/orders/kpi?from=&to=      → Dashboard metrics
```

---

## 3. SERVICES (Clean Architecture)

```
src/customers/                    # New module
  ├── entities/customer.entity.ts
  ├── dto/
  ├── customers.service.ts         # CRUD + debt calc
  ├── customers.controller.ts
  └── customers.module.ts

src/sales/                        # New module
  ├── entities/
  │   ├── sales-quote.entity.ts
  │   ├── sales-quote-line.entity.ts
  │   ├── sales-order.entity.ts
  │   └── sales-order-line.entity.ts
  ├── dto/
  ├── enums/sales.enum.ts         # QuoteStatus, OrderStatus, CustomerType
  ├── domain/
  │   └── logic/
  │       ├── pricing.calculator.ts   # Pure: tính line_subtotal/discount/tax/total
  │       └── credit.checker.ts       # Pure: compare outstanding + new vs limit
  ├── sales-quote.service.ts      # Quote lifecycle
  ├── sales-order.service.ts      # SO + Outbound integration
  ├── sales.controller.ts
  └── sales.module.ts
```

### Service contracts

**PricingCalculator (domain, pure function)**
```typescript
calculateLine(qty, unitPrice, discountPct, taxPct): {
  subtotal, discount, tax, total
}
calculateQuote(lines): { total_subtotal, total_discount, total_tax, grand_total }
```
→ Test 100% (tuân thủ BR-SALES-02, 03)

**CreditChecker (domain, pure function)**
```typescript
check(customerDebt, creditLimit, newOrderAmount, hasByPassPriv): {
  allowed: boolean, shortfall: number, requiresBypass: boolean
}
```

**SalesOrderService.create()** flow:
1. Validate customer `is_active && !is_blacklisted`
2. CreditChecker.check() → throw nếu fail + no bypass
3. Wrap transaction:
   - Calculate totals (PricingCalculator)
   - Create SO + lines
   - Create OutboundOrder (reuse OutboundService — inject) linking `reference_code = order_number`
   - Link `so.outbound_order_id = ob.id`
   - Update customer.current_debt += grand_total
4. Return SO with Outbound

**SalesOrderService.cancel()**:
- Check Outbound status — if PICKED+, throw
- Transaction: SO.status = CANCELED, Outbound.status = CANCELED, customer.current_debt -= grand_total

---

## 4. PRIVILEGES

Thêm vào `privilege.enum.ts`:
```typescript
MANAGE_CUSTOMER = 'MANAGE_CUSTOMER',
VIEW_SALES = 'VIEW_SALES',
CREATE_SALES = 'CREATE_SALES',
MANAGE_SALES = 'MANAGE_SALES',
BYPASS_CREDIT_LIMIT = 'BYPASS_CREDIT_LIMIT',
```

---

## 5. INTEGRATION POINTS

| Module | Tích hợp |
|--------|---------|
| **Outbound** | `SalesOrderService` inject `OutboundService.createFromSalesOrder(so, lines)` |
| **Customers** | SalesOrder FK customer; update `current_debt` khi SO confirm/cancel/paid |
| **Products** | QuoteLine/OrderLine FK product_id (không nhân bản master data) |
| **Approvals** (Phase B) | Quote gửi duyệt trước khi SENT nếu value > threshold |
| **Finance** (Phase B) | SO DELIVERED → trigger AR invoice |

**Loose coupling:** Dùng string UUID references cho Finance — tránh circular deps khi Finance module xuất hiện.

---

## 6. DATABASE MIGRATION

Tên: `AddSalesModule` timestamp `1776200000000`.

Tạo:
- Enums: `customer_type`, `quote_status`, `sales_order_status`
- 5 tables: customers, sales_quotes, sales_quote_lines, sales_orders, sales_order_lines
- FK RESTRICT cho customer (tránh xoá khách có SO)
- FK CASCADE cho lines (xoá quote/order → xoá lines)
- Indexes composite trên query thường xuyên

---

## 7. CRON JOBS

- Daily 00:05: auto mark Quote `SENT` quá `expiry_date` → `EXPIRED` (sử dụng `@nestjs/schedule`)

---

## 8. TEST STRATEGY (Gate 4)

- **Domain logic 100%:** PricingCalculator (VAT sau discount, edge 0%/100%), CreditChecker (allowed/shortfall/bypass)
- **Service tests:**
  - Quote lifecycle (DRAFT → SENT → ACCEPTED → CONVERT)
  - Credit limit block / bypass
  - SO → Outbound wiring (mock OutboundService)
  - Cancel SO khi Outbound đã PICKED → block
  - Customer debt update sau confirm/cancel
- **Negative:** Blacklist, duplicate convert, expired quote

---

## 9. CHECKLIST GATE 2

- [x] ERD 5 entities rõ ràng, quan hệ FK định nghĩa
- [x] API endpoints (17 endpoints) đầy đủ CRUD + lifecycle
- [x] DTOs sẽ viết ở Gate 3 theo contract
- [x] Clean Architecture folder (domain/logic pure functions)
- [x] Integration points với Outbound, Customers, Products
- [x] Privilege matrix mở rộng (5 quyền mới)
- [x] Migration plan rõ ràng
