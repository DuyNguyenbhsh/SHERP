# BA_SPEC: WMS Core (Inbound + Outbound + Inventory)

> **Feature:** Nghiệp vụ kho vận lõi — Nhập hàng, Xuất hàng, Quản lý tồn kho
> **Chuẩn tham chiếu:** Oracle Fusion Cloud — Warehouse Management
> **Ngày tạo:** 2026-04-11
> **Trạng thái:** Gate 1 — BA Analysis (Retro-fit cho code đã DEV)

---

## 1. Bối cảnh nghiệp vụ

WMS Core cung cấp 3 luồng nghiệp vụ chính trong chuỗi cung ứng:

```
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│  INBOUND         │   │  INVENTORY       │   │  OUTBOUND        │
│  (Dock-to-Stock) │──▶│  (Stock Mgmt)    │──▶│  (O2F)           │
│                  │   │                  │   │                  │
│ ASN→Receive→QC   │   │ On-hand, Location│   │ Pick→Pack→Ship   │
│ →Putaway         │   │ Transfer, Cycle  │   │                  │
└──────────────────┘   └──────────────────┘   └──────────────────┘
```

**Scope feature này:** Lõi vận hành kho — các nghiệp vụ diễn ra bên trong 1 warehouse, không bao gồm TMS (vận chuyển liên kho) hay MES (sản xuất).

---

## 2. User Stories

### Nhóm A — INBOUND (Dock-to-Stock)

#### US-A01: Tạo phiếu nhận hàng từ PO
> **As a** Warehouse Operator,
> **I want to** tạo Inbound Receipt từ Purchase Order đã được duyệt,
> **So that** tôi có cơ sở đối chiếu số lượng khi hàng thực tế về kho.

**Acceptance Criteria:**
- Inbound Receipt link tới PO gốc
- Auto-sinh mã `IB-YYMMDD-XXX`
- Copy dòng hàng từ PO sang Inbound Lines (qty_ordered)
- Status khởi tạo: `DRAFT`

#### US-A02: Ghi nhận số lượng thực tế (Receiving)
> **As a** Warehouse Operator,
> **I want to** nhập số lượng thực tế từng dòng hàng khi nhận,
> **So that** hệ thống phát hiện thiếu/thừa so với PO.

**Acceptance Criteria:**
- Nhập `qty_received` cho từng line
- Nếu `qty_received < qty_ordered` → đánh dấu `SHORT`
- Nếu `qty_received > qty_ordered` → đánh dấu `OVER`, cần duyệt thêm
- Status chuyển: `DRAFT → RECEIVING → RECEIVED`

#### US-A03: Quality Control (QC)
> **As a** QC Inspector,
> **I want to** kiểm tra chất lượng hàng nhận trước khi cho lên kệ,
> **So that** chỉ hàng đạt chuẩn mới vào tồn kho sử dụng được.

**Acceptance Criteria:**
- Ghi nhận `qty_passed`, `qty_failed`, `qty_hold`
- Lý do fail: lưu vào notes
- Chỉ hàng `PASSED` mới được Putaway
- Status: `RECEIVED → QC_PENDING → QC_PASSED / QC_FAILED`

#### US-A04: Putaway (Lên kệ)
> **As a** Warehouse Operator,
> **I want to** chỉ định location lưu kho cho từng lô hàng,
> **So that** hàng được lưu đúng khu vực và có thể tìm lại nhanh.

**Acceptance Criteria:**
- Chọn location (phải có đủ capacity)
- Tạo/cập nhật `InventoryItem` theo `product_id + location_id + lot_number`
- Cập nhật `Location.current_qty`
- Phải wrap trong DB transaction (ACID) — rollback nếu fail
- Status: `QC_PASSED → PUTAWAY_PENDING → COMPLETED`

---

### Nhóm B — OUTBOUND (Order-to-Fulfillment)

#### US-B01: Tạo Outbound Order từ Sales Order
> **As a** Sales Ops,
> **I want to** tạo Outbound Order từ Sales Order đã confirm,
> **So that** kho có lệnh xuất hàng cho khách.

**Acceptance Criteria:**
- Auto-sinh mã `OB-YYMMDD-XXX`
- Link tới customer + delivery address
- Copy dòng hàng từ SO sang Outbound Lines (qty_planned)
- Status khởi tạo: `DRAFT`

#### US-B02: Wave Planning & Picking
> **As a** Warehouse Operator,
> **I want to** lấy hàng theo thứ tự tối ưu (wave planning),
> **So that** giảm thời gian di chuyển trong kho.

**Acceptance Criteria:**
- Hệ thống suggest location lấy hàng (FIFO theo lot, nearest location)
- Nhập `qty_picked` cho từng line
- Trừ `InventoryItem.qty_on_hand` và `Location.current_qty`
- PHẢI wrap trong DB transaction
- Không cho phép pick quá `qty_on_hand` (tránh âm tồn kho)
- Status: `DRAFT → WAVE_PLANNED → PICKING → PICKED`

#### US-B03: Packing
> **As a** Warehouse Operator,
> **I want to** đóng gói hàng đã pick thành các package,
> **So that** chuẩn bị cho bước shipping.

**Acceptance Criteria:**
- Nhập thông tin package: weight, dimension, package_count
- In nhãn package
- Status: `PICKED → PACKED`

#### US-B04: Shipping
> **As a** Warehouse Operator,
> **I want to** xuất hàng cho TMS gắn vào waybill,
> **So that** hàng được vận chuyển đến khách.

**Acceptance Criteria:**
- Link outbound order với waybill (cross-module TMS)
- Status: `PACKED → SHIPPED → DELIVERED` (sau POD từ TMS)

---

### Nhóm C — INVENTORY (Stock Management)

#### US-C01: Xem tồn kho hiện tại
> **As a** Inventory Manager,
> **I want to** xem on-hand theo product + location + lot,
> **So that** biết tồn kho hiện tại ở đâu.

**Acceptance Criteria:**
- Filter theo: warehouse, product, location, lot, status
- Hiển thị: qty_on_hand, qty_allocated (đã reserve), qty_available = on_hand - allocated
- Export Excel

#### US-C02: Chuyển kho nội bộ (Transfer)
> **As a** Warehouse Operator,
> **I want to** chuyển hàng từ location A sang location B,
> **So that** tối ưu vị trí lưu trữ.

**Acceptance Criteria:**
- Chỉ định source + destination location
- Trừ source, cộng destination
- Wrap trong DB transaction
- Ghi history: `InventoryTransferLog`

#### US-C03: Cycle Count (Kiểm kê định kỳ)
> **As a** Inventory Manager,
> **I want to** kiểm kê định kỳ và ghi nhận chênh lệch,
> **So that** đảm bảo số liệu hệ thống khớp thực tế.

**Acceptance Criteria:**
- Tạo cycle count task theo location
- Operator đếm thực tế, nhập `qty_counted`
- Hệ thống tính `variance = qty_counted - qty_on_hand`
- Nếu variance ≠ 0 → cần approval từ Manager để adjust
- Tạo `InventoryAdjustmentLog`

---

## 3. Business Rules

### BR-01: Quy tắc ACID Transaction (BẮT BUỘC)
Mọi thao tác thay đổi tồn kho phải wrap trong `DataSource.transaction()`:
- Putaway (Inbound): tạo InventoryItem + cập nhật Location
- Pick (Outbound): trừ InventoryItem + trừ Location + cập nhật OutboundLine
- Transfer (Inventory): trừ source + cộng destination

Nếu bất kỳ bước nào fail → rollback toàn bộ. **KHÔNG CHO PHÉP PARTIAL UPDATE.**

### BR-02: Không âm tồn kho
- `qty_on_hand` sau transaction phải ≥ 0
- `Location.current_qty` sau transaction phải ≥ 0 và ≤ `Location.capacity`
- Vi phạm → REJECT với message tiếng Việt rõ ràng

### BR-03: FIFO cho lot-controlled products
- Khi pick, suggest lot có `received_date` nhỏ nhất trước
- Không cho phép pick lot mới khi lot cũ chưa hết

### BR-04: QC mandatory cho controlled categories
- Category `PHARMACEUTICAL`, `FOOD`, `ELECTRONICS` → bắt buộc qua QC
- Category `GENERAL` → có thể skip QC (configurable)

### BR-05: Status Transitions (State Machine)

**Inbound:**
```
DRAFT → RECEIVING → RECEIVED → QC_PENDING → QC_PASSED → PUTAWAY_PENDING → COMPLETED
                                          ↘ QC_FAILED → RETURNED
```

**Outbound:**
```
DRAFT → WAVE_PLANNED → PICKING → PICKED → PACKED → SHIPPED → DELIVERED
                                                          ↘ CANCELED
```

### BR-06: Auto-generated Codes
- Inbound Receipt: `IB-YYMMDD-XXX` (sequential daily)
- Outbound Order: `OB-YYMMDD-XXX`
- Transfer Order: `TR-YYMMDD-XXX`
- Cycle Count: `CC-YYMMDD-XXX`

### BR-07: Ảnh hưởng Budget Control (Hard Limit)
- Outbound cho Project (Material Issue) → gọi `BudgetCheckService.check({ type: 'INVENTORY_ISSUE', amount_type: 'CONSUMED' })`
- Nếu REJECTED → chặn Pick, không cho xuất
- Tham chiếu: `hard-limit-budget-control/BA_SPEC.md` US-02

---

## 4. KPI & Metrics

| KPI | Công thức | Mô tả |
|---|---|---|
| **Inventory Turnover** | `COGS / Avg Inventory Value` | Vòng quay tồn kho |
| **Days of Supply** | `On-hand Qty / Avg Daily Demand` | Số ngày tồn kho đủ dùng |
| **Order Fulfillment Rate** | `Orders Shipped On-time / Total Orders × 100` | Tỷ lệ giao đúng hạn |
| **Picking Accuracy** | `Correct Picks / Total Picks × 100` | Độ chính xác lấy hàng |
| **Putaway Time** | `AVG(Putaway_end - Receiving_end)` | Thời gian trung bình lên kệ |
| **Stock Accuracy** | `1 - |Variance| / On-hand Qty` | Độ chính xác số liệu sau cycle count |
| **Dock-to-Stock Time** | `AVG(Putaway_end - ASN_received)` | Tổng thời gian từ nhận ASN → sẵn sàng xuất |
| **Order-to-Ship Time** | `AVG(Shipped_time - Order_created_time)` | Thời gian xử lý đơn hàng |

---

## 5. Trường dữ liệu

### 5.1 Inbound Receipt
| Field | Type | Bắt buộc |
|---|---|---|
| `id` | UUID | Yes |
| `receipt_number` | VARCHAR(50) unique | Yes |
| `po_id` | FK procurement | No |
| `supplier_id` | FK | Yes |
| `warehouse_id` | FK | Yes |
| `status` | ENUM | Yes |
| `received_by` | FK users | Yes |
| `received_at` | DATETIME | Yes |

### 5.2 Outbound Order
| Field | Type | Bắt buộc |
|---|---|---|
| `id` | UUID | Yes |
| `order_number` | VARCHAR(50) unique | Yes |
| `customer_id` | FK | Yes |
| `sales_order_id` | FK sales | No |
| `waybill_id` | FK tms | No (set khi dispatch) |
| `warehouse_id` | FK | Yes |
| `status` | ENUM | Yes |
| `delivery_address` | TEXT | Yes |

### 5.3 Inventory Item
| Field | Type | Bắt buộc |
|---|---|---|
| `id` | UUID | Yes |
| `product_id` | FK | Yes |
| `location_id` | FK | Yes |
| `lot_number` | VARCHAR(50) | No |
| `qty_on_hand` | DECIMAL(18,4) | Yes |
| `qty_allocated` | DECIMAL(18,4) | Yes |
| `warehouse_code` | VARCHAR(20) | Yes (denormalized) |
| `received_date` | DATE | Yes (cho FIFO) |
| `status` | ENUM | Yes — AVAILABLE / HOLD / EXPIRED |

---

## 6. Ảnh hưởng đến module khác

| Module | Ảnh hưởng |
|---|---|
| **Procurement** | Inbound link PO, update GRN status |
| **Sales** | Outbound link SO, update fulfillment status |
| **TMS** | Outbound link Waybill (dispatch flow) |
| **Budget Control** | Material Issue → check hard limit trước pick |
| **Finance (GL)** | Cycle count adjustment → journal entry cân đối tồn kho |
| **Reporting** | Các KPI ở mục 4 feed vào dashboard |

---

## 7. BA Checklist

- [x] User Stories đã liệt kê đầy đủ (11 stories: 4 Inbound + 4 Outbound + 3 Inventory)
- [x] Business Rules rõ ràng — ACID transaction, FIFO, QC mandatory
- [x] KPI fields được xác định (8 metrics)
- [x] Ảnh hưởng đến Financials (Cycle count adjustment, Budget check) đã đánh giá
- [x] State machine đã vẽ (Inbound + Outbound)
- [x] Data fields đã liệt kê

---

> **Lưu ý retro-fit:** Feature này đã được DEV và đang chạy production (27 modules backend). BA Spec này được viết ngược để document nghiệp vụ hiện tại và làm cơ sở cho các thay đổi tương lai. Cần SA review lại để align với code hiện tại và viết `SA_DESIGN.md` tương ứng.
>
> **BA Sign-off:** Sẵn sàng chuyển Gate 2 — SA Design (cần retro-fit).
