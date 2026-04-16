# DEPLOY_CHECKLIST: Module Sales (O2C)

> **Ngày:** 2026-04-16 · **Gate:** 5 — DevOps

## 1. Migration

- File: `wms-backend/src/migrations/1776200000000-AddSalesModule.ts`
- Tạo: 5 tables (customers, sales_quotes, sales_quote_lines, sales_orders, sales_order_lines) + 5 enums
- Backfill: KHÔNG (module mới — không có data cũ)
- FK RESTRICT customer → tránh xoá KH có lịch sử

```bash
# Backup production trước
DATABASE_URL="postgresql://..." npm run db:backup

# Migration
cd wms-backend && npm run migration:run

# Verify
psql "$DATABASE_URL" -c "\dt customers; \dt sales_*"
```

## 2. Seed privileges mới

5 privileges mới (đã thêm vào `privilege.enum.ts`):
- `MANAGE_CUSTOMER`
- `VIEW_SALES`
- `CREATE_SALES`
- `MANAGE_SALES`
- `BYPASS_CREDIT_LIMIT` ⚠️ chỉ cấp cho Finance Manager / Director

**ACTION:** Sau migration, chạy SeedService hoặc insert thủ công 5 rows vào `privileges` table, sau đó gán vào role SUPER_ADMIN:

```sql
INSERT INTO privileges (privilege_code, privilege_name) VALUES
  ('MANAGE_CUSTOMER', 'Quản lý khách hàng'),
  ('VIEW_SALES', 'Xem Sales'),
  ('CREATE_SALES', 'Tạo Sales Order/Quote'),
  ('MANAGE_SALES', 'Quản lý Sales (full)'),
  ('BYPASS_CREDIT_LIMIT', 'Bypass credit limit');

-- Cấp cho SUPER_ADMIN (thay role_id thực tế)
INSERT INTO role_privileges (role_id, privilege_id)
SELECT '<SUPER_ADMIN_ROLE_ID>', id FROM privileges
WHERE privilege_code IN ('MANAGE_CUSTOMER','VIEW_SALES','CREATE_SALES','MANAGE_SALES','BYPASS_CREDIT_LIMIT');
```

## 3. Env vars

KHÔNG có env mới. Module dùng DATABASE_URL + JWT_SECRET hiện có.

## 4. Cron (Phase B — không bắt buộc cho release này)

`SalesQuoteService.markExpired()` cần wire `@nestjs/schedule`:
```typescript
@Cron('5 0 * * *') // Daily 00:05
async handleQuoteExpiry() {
  const affected = await this.quoteService.markExpired();
  this.logger.log(`Marked ${affected} quotes as EXPIRED`);
}
```

## 5. Smoke test post-deploy

```bash
# 1. Health check
curl https://<host>/api | jq

# 2. Login → lấy token
TOKEN=$(curl -s -X POST ... | jq -r '.data.access_token')

# 3. Tạo customer
curl -X POST https://<host>/api/customers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Khách Test","customer_type":"CORPORATE","credit_limit":10000000}'

# 4. Liệt kê
curl https://<host>/api/customers -H "Authorization: Bearer $TOKEN" | jq

# 5. Sales KPI
curl https://<host>/api/sales/kpi -H "Authorization: Bearer $TOKEN" | jq
```

## 6. Rollback

Nếu có sự cố:
```bash
cd wms-backend && npm run migration:revert  # Rollback AddSalesModule
```

Migration này chỉ CREATE TABLE → revert chỉ DROP TABLE (không mất data cũ).

## 7. Post-deploy verification

- [ ] Migration chạy success, 5 tables xuất hiện
- [ ] Swagger `/docs` có tag "Sales - Bán hàng (O2C)" + "Customers - Khách hàng"
- [ ] Tạo customer qua Swagger UI → nhận CUS-YYMMDD-001
- [ ] Tạo SO qua UI → Outbound auto-created + toast hiển thị OB number
- [ ] Frontend sidebar có group "Bán hàng (O2C)"
- [ ] `/customers` + `/sales` render đầy đủ
- [ ] Full test suite 376/376 vẫn PASS

## 8. Known limitations (ship as-is, plan Phase B)

- BR-SALES-04: Cron auto-expire chưa wire (cần @nestjs/schedule)
- BR-SALES-07: Revenue log → AR invoice (chờ Finance module)
- UI chưa có: edit Quote lines, convert Quote → SO trực tiếp từ UI (hiện phải tạo SO mới)
- Chưa có commission tracking (chờ HRM payroll)
