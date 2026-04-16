# Domain Layer Refactor Proposal: WMS Core

> **Target modules:** `inbound/`, `outbound/`, `inventory/`
> **Ngày đề xuất:** 2026-04-11
> **Trạng thái:** Proposal (chưa thực thi — cần SA approve)
> **Lý do:** Tuân thủ rule `.claude/rules/sa-rules.md` — "Cấm Fat Services, logic nghiệp vụ nặng phải nằm trong `domain/logic`"

---

## 1. Hiện trạng

| Module | File service | LOC | Domain layer |
|---|---|---|---|
| `inbound/` | `inbound.service.ts` | 341 | ❌ Không có |
| `outbound/` | `outbound.service.ts` | 305 | ❌ Không có |
| `inventory/` | `inventory.service.ts` | 294 | ❌ Không có |

**Vi phạm rule SA:** 3 service này hiện chứa:
- DB query (`this.repo.findOne`, QueryBuilder) — thuộc infrastructure
- Validation business rule (capacity check, FIFO, transfer qty) — thuộc domain
- State transition logic — thuộc domain
- Auto-generated code pattern — thuộc domain

Tất cả trộn lẫn trong cùng 1 file → khó test, khó reuse, vi phạm Clean Architecture.

---

## 2. Pure Functions cần extract

### 2.1 `inbound/domain/logic/inbound.logic.ts`

```typescript
// Validate location có đủ sức chứa cho putaway
export function validatePutawayCapacity(
  putawayQty: number,
  currentQty: number,
  maxCapacity: number,
): { valid: boolean; error?: string } {
  if (putawayQty <= 0) return { valid: false, error: 'Số lượng phải > 0' };
  if (currentQty + putawayQty > maxCapacity) {
    return {
      valid: false,
      error: `Vượt sức chứa location: ${currentQty + putawayQty}/${maxCapacity}`,
    };
  }
  return { valid: true };
}

// Xác định receipt đã putaway xong chưa
export function determinePutawayCompletion(
  allLines: Array<{ putaway_location_id: string | null }>,
): boolean {
  return allLines.every((l) => l.putaway_location_id !== null);
}

// Validate số lượng QC không vượt qty_received
export function validateQcQuantity(
  qcAccepted: number,
  qcRejected: number,
  qtyReceived: number,
): { valid: boolean; error?: string } {
  if (qcAccepted + qcRejected > qtyReceived) {
    return {
      valid: false,
      error: `Tổng QC (${qcAccepted + qcRejected}) vượt số lượng nhận (${qtyReceived})`,
    };
  }
  return { valid: true };
}

// Pure function sinh mã receipt — format IB-YYMMDD-XXX
export function generateInboundReceiptNumber(
  date: Date,
  sequenceOfDay: number,
): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const seq = String(sequenceOfDay).padStart(3, '0');
  return `IB-${yy}${mm}${dd}-${seq}`;
}
```

### 2.2 `outbound/domain/logic/outbound.logic.ts`

```typescript
export function calculateRemainingPickQty(
  requestedQty: number,
  pickedQty: number,
): number {
  return Math.max(0, requestedQty - pickedQty);
}

export function determinePickCompletion(
  allLines: Array<{ pick_status: string }>,
): boolean {
  return allLines.every((l) => l.pick_status === 'PICKED');
}

export function validateBoqThreshold(
  lineAmount: number,
  boqThreshold: number,
): { exceeded: boolean; warning?: string } {
  if (lineAmount > boqThreshold) {
    return {
      exceeded: true,
      warning: `Vượt BOQ threshold: ${lineAmount.toLocaleString('vi-VN')} > ${boqThreshold.toLocaleString('vi-VN')}`,
    };
  }
  return { exceeded: false };
}

export function generateOutboundOrderNumber(
  date: Date,
  sequenceOfDay: number,
): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const seq = String(sequenceOfDay).padStart(3, '0');
  return `OB-${yy}${mm}${dd}-${seq}`;
}

// FIFO: Chọn lot có received_date sớm nhất
export function suggestFifoLot<T extends { received_date: Date; qty_on_hand: number }>(
  availableLots: T[],
): T | null {
  const eligible = availableLots.filter((l) => l.qty_on_hand > 0);
  if (eligible.length === 0) return null;
  return eligible.sort(
    (a, b) => a.received_date.getTime() - b.received_date.getTime(),
  )[0];
}
```

### 2.3 `inventory/domain/logic/inventory.logic.ts`

```typescript
export function validateTransferQty(
  sourceQty: number,
  requestQty: number,
): { valid: boolean; error?: string } {
  if (requestQty <= 0) return { valid: false, error: 'Số lượng chuyển phải > 0' };
  if (requestQty > sourceQty) {
    return {
      valid: false,
      error: `Tồn kho nguồn không đủ: có ${sourceQty}, yêu cầu ${requestQty}`,
    };
  }
  return { valid: true };
}

export function validateAdjustmentQty(
  currentQty: number,
  adjustmentQty: number,
): { valid: boolean; error?: string; newQty: number } {
  const newQty = currentQty + adjustmentQty;
  if (newQty < 0) {
    return {
      valid: false,
      error: `Điều chỉnh sẽ làm tồn kho âm: ${currentQty} + (${adjustmentQty}) = ${newQty}`,
      newQty,
    };
  }
  return { valid: true, newQty };
}

// Available = on-hand - allocated
export function calculateAvailableQty(
  qtyOnHand: number,
  qtyAllocated: number,
): number {
  return Math.max(0, qtyOnHand - qtyAllocated);
}
```

---

## 3. Lợi ích

| Tiêu chí | Hiện tại | Sau refactor |
|---|---|---|
| Test logic tài chính/nghiệp vụ | Phải mock TypeORM repo → test chậm, fragile | Unit test pure function → test nhanh, chắc chắn |
| Coverage cho logic | ~0% | Dễ đạt 100% |
| Tái sử dụng | Copy-paste giữa các module | Import từ domain/logic |
| Vi phạm SA rule "Fat Services" | ✅ Vi phạm | ❌ Fix |

---

## 4. Kế hoạch thực thi (non-breaking)

**Bước 1 — Extract (KHÔNG đổi behavior):**
1. Tạo thư mục `src/<module>/domain/logic/`
2. Copy logic → pure function mới
3. Service gọi pure function thay vì inline

**Bước 2 — Test:**
4. Viết `*.logic.spec.ts` cho từng pure function (target 100% coverage)
5. Chạy `npm run test` → đảm bảo existing tests vẫn pass

**Bước 3 — Clean up:**
6. Remove dead code trong service
7. Code review + merge

**Risk:** LOW — chỉ là extract, không thay đổi behavior. Có thể rollback dễ dàng.

**Effort ước tính:**
- Inbound: 2h (4 functions + 4 test files)
- Outbound: 2.5h (5 functions + 5 test files)
- Inventory: 2h (3 functions + 3 test files)
- **Tổng: ~6-7h dev work**

---

## 5. Không refactor

Các method sau là CRUD đơn giản (chỉ gọi repo.find/save) → **giữ nguyên trong service**:
- `findAll()`, `findOne()` cho cả 3 modules
- `createLocation()`, `updateLocation()` trong inventory
- `getSummaryByProduct()` — query aggregation đơn giản

---

> **Đề xuất:** Tạo riêng 1 task "WMS Domain Extraction" cho sprint tiếp theo, không gộp chung với feature mới. Refactor thuần không có feature → dễ review, dễ rollback.
