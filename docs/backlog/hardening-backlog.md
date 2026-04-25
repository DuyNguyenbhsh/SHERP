# Hardening Backlog

Follow-up tickets phát sinh từ các pass audit (review session, /ultrareview, hậu Gate 6) — không scope vào feature đang chạy. Cập nhật khi có audit mới hoặc ticket close.

---

## BACKEND-BODY-PARSER-ROUTE-LEVEL-LIMIT
**Severity:** Low
**Source:** Audit commit b3bc6fa (body parser 50MB global)
**Description:** Global body parser 50MB có thể memory-spike khi user upload nhầm file lớn vào endpoint không cần (hầu hết JSON < 1MB). Narrow xuống route-level limit:
- /boq/import: 50MB
- /ncr/attachments: 10MB
- /master-plan/template: 50MB
- All others: 1MB default

**Impact:** Memory protection against OOM
**Effort:** 1-2h

## FE-ENTITY-PICKER-CONSUME-QUERYSTATEROW
**Severity:** Low
**Source:** Audit commit b883ae7 + Gate 4B EntityPicker error state
**Description:** EntityPicker (shared/ui/entity-picker/) hiện tự render Loading/Error/Empty inline. Trong khi shared/ui/QueryStateRow.tsx (added b883ae7) đã chuẩn hoá pattern này cho TableRow. Refactor EntityPicker consume QueryStateRow để DRY State Matrix logic — single source of truth.

**Impact:** Consistency, maintainability
**Effort:** 2-3h
**Note:** Tech Advisor đã ghi nhận overlap khi review b883ae7. Không scope cho feature/master-plan-project-lookup.
