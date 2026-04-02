# SH-GROUP WMS/ERP Backend — Rules of Engagement

## 1. Project Identity

- **Project:** SH-GROUP WMS/ERP Backend — Hệ thống Quản lý Kho vận & Chuỗi cung ứng doanh nghiệp.
- **Ngôn ngữ giao tiếp:** Luôn trả lời, giải thích logic, viết comment code và error messages bằng **Tiếng Việt**.
- **Chuẩn hóa API Response:** Mọi API trả về (bao gồm cả lỗi) phải bọc trong format: `{ status, message, data }`. Không ném trực tiếp lỗi DB ra ngoài.

---

## 2. Core Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS (TypeScript strict mode) |
| ORM | TypeORM |
| Database | PostgreSQL (NeonDB cloud, SSL required) |
| Auth | JWT (`@nestjs/jwt`) + bcrypt |
| Validation | `class-validator` + `class-transformer` |
| API Docs | `@nestjs/swagger` + `swagger-ui-express` (endpoint: `/api`) |
| Config | `@nestjs/config` + `.env` (KHÔNG hardcode secrets) |

---

## 3. Commands

```bash
# Development
npm run start:dev          # Watch mode (khuyến nghị cho dev)
npm run start:debug        # Attach debugger port 9229

# Build & Production
npm run build              # Compile TypeScript → dist/
npm run start:prod         # Run dist/main.js

# Database Migrations (BẮT BUỘC cho mọi thay đổi schema)
npm run migration:generate src/migrations/<TenMigration> # So sánh entities vs DB → sinh migration
npm run migration:run      # Áp dụng migration lên DB
npm run migration:revert   # Rollback migration gần nhất

# Testing & Quality
npm run test               # Unit tests
npm run test:e2e           # End-to-end tests
npm run lint               # ESLint auto-fix
npm run format             # Prettier formatting
```

---

## 4. Architecture Rules (BẮT BUỘC)

### 4.1 Clean Architecture — Feature-based Module Organization

Mỗi domain module PHẢI tuân thủ cấu trúc:

```
src/<module>/
  ├── entities/          # TypeORM entity classes
  ├── dto/               # Request DTOs (class-validator)
  ├── enums/             # Business state enums
  ├── <module>.controller.ts   # Route handlers + Swagger decorators
  ├── <module>.service.ts      # Business logic + DB queries
  └── <module>.module.ts       # NestJS module registration
```

### 4.2 Domain Modules

| Nhóm | Module | Trạng thái | Trách nhiệm |
|---|---|---|---|
| **Foundation** | `auth/` | Done | Login, JWT strategy, Privilege Guard |
| | `users/` | Done | User accounts, roles, privileges |
| | `organizations/` | Done | Cây sơ đồ tổ chức/phòng ban |
| | `master-data/` | Done | Dữ liệu tham chiếu (tỉnh/thành, loại hàng) |
| | `seed/` | Done | Database seeding (privileges + sample data) |
| **SCM & WMS** | `procurement/` | Done | S2P: PO → GRN → Serial Number |
| | `suppliers/` | Done | Quản lý nhà cung cấp + điều khoản thanh toán |
| | `products/` | Done | Master data sản phẩm, costing, planning |
| | `inbound/` | Done | Dock-to-Stock: Receiving → QC → Putaway |
| | `inventory/` | Done | Tồn kho, Location hierarchy, Transfer |
| | `outbound/` | Done | Order-to-Fulfillment: Picking → Packing |
| **TMS** | `tms/` | Done | Dock-to-Door: Waybill, Consolidation, POD |
| | `vehicles/` | Done | Fleet management: đội xe, tài xế |
| **Planned** | `mes/` | Planned | Plan-to-Produce: lệnh sản xuất, NVL |
| | `sales/` | Planned | O2C: Báo giá, Sales Order |
| | `finance/` | Planned | R2R: AP/AR, Sổ cái (GL) |
| | `hrm/` | Planned | H2R: Chấm công, Tính lương |

### 4.3 Key Design Patterns

- **RBAC:** `User → UserRole → Role → RolePrivilege → Privilege`. Privileges nhúng vào JWT payload lúc login (stateless authorization).
- **Optimistic Locking:** `@VersionColumn()` trên Product, Supplier — chống xung đột concurrent update.
- **Soft Delete:** Cờ `is_active: boolean` — KHÔNG hard delete records.
- **Audit Timestamps:** `@CreateDateColumn()` + `@UpdateDateColumn()` trên mọi entity.
- **Denormalization:** `warehouse_code` lưu trực tiếp trên InventoryItem/Location — tránh recursive tree queries.

---

## 5. Database & Migration Rules (NGHIÊM NGẶT)

### 5.1 Quy tắc tuyệt đối

- **CẤM VĨNH VIỄN** sử dụng `synchronize: true`. Mọi thay đổi schema PHẢI đi qua TypeORM Migrations.
- **CẤM** hardcode Database URL, JWT Secret trong source code. Dùng `ConfigService` + `.env`.
- File `.env` PHẢI nằm trong `.gitignore`.

### 5.2 Migration Pipeline

```
1. Tạo/sửa Entity → 2. migration:generate → 3. Review file migration → 4. migration:run
```

- Data source CLI: `src/typeorm-data-source.ts` (dùng entity glob `src/**/*.entity.ts`)
- Migration files: `src/migrations/*.ts`
- Luôn review migration file trước khi chạy — kiểm tra xung đột bảng/enum.

### 5.3 Migration History

| # | Migration | Mô tả |
|---|---|---|
| 1 | `InitialSchema` | Bảng nền tảng (users, products, suppliers, procurement, waybill) |
| 2 | `WmsCoreInit` | WMS core (inbound, inventory, outbound, locations) |
| 3 | `CleanupTmsOutboundPlaceholder` | Drop bảng placeholder `outbound_order` |
| 4 | `TmsWaybillIntegration` | Bảng `waybills`, FK outbound↔waybill, enum DELIVERED |

### 5.4 Cross-Module Relationships

- **Inbound → Inventory:** Putaway tạo/cập nhật `InventoryItem` + `Location.current_qty`. Import entities trực tiếp.
- **Outbound → Inventory:** Pick trừ `InventoryItem.qty_on_hand` + `Location.current_qty`. Import entities trực tiếp.
- **TMS → Outbound:** `Waybill.outbound_orders` (OneToMany). FK `outbound_orders.waybill_id`.
- **TMS → Vehicles:** `Waybill.vehicle` (ManyToOne). FK `waybills.vehicle_id`.
- **Modules planned (Sales, Finance, MES):** Nên dùng **loose coupling** — tham chiếu qua UUID string thay vì hard FK, để tránh circular dependency khi hệ thống mở rộng.

### 5.5 DB Optimization

- Tránh `SELECT *` — chỉ select columns cần thiết khi query nặng.
- Composite indexes trên columns query thường xuyên (`IDX_INV_PRODUCT_STATUS`, `IDX_INV_PRODUCT_LOCATION_LOT`).
- Chú ý N+1 query — dùng `relations` hoặc `QueryBuilder` join khi cần.

---

## 6. Business Logic Rules — ACID Transactions (BẮT BUỘC)

Các thao tác thay đổi tồn kho **PHẢI** wrap trong `DataSource.transaction()`:

| Thao tác | Module | Method | Lý do |
|---|---|---|---|
| **Putaway** (Lên kệ) | `inbound` | `putaway()` | Tạo InventoryItem + cập nhật Location |
| **Pick** (Lấy hàng) | `outbound` | `pickItem()` | Trừ InventoryItem + Location + cập nhật OutboundLine |
| **Transfer** (Chuyển kho) | `inventory` | `transferInventory()` | Trừ location nguồn + cộng location đích |
| **Delivery** (Giao hàng) | `tms` | `completeDelivery()` | Chuyển Waybill + tất cả OutboundOrders → DELIVERED |

**Nguyên tắc:** Nếu bất kỳ bước nào fail → toàn bộ transaction rollback. Không cho phép partial update dẫn đến sai lệch tồn kho.

---

## 7. Security & Validation (BẮT BUỘC)

### 7.1 Authentication Flow

```
POST /auth/login → bcrypt verify → Aggregate privileges → Sign JWT
JWT payload: { sub: userId, username, privileges: string[] }
```

### 7.2 Route Protection

Mọi controller (trừ `AuthController.login`) PHẢI có:

```typescript
@UseGuards(JwtAuthGuard, PrivilegeGuard)  // Class-level
@RequirePrivilege('MANAGE_XXX')            // Method-level (cho write operations)
```

### 7.3 DTO Validation

- Mọi request body PHẢI có DTO class với `class-validator` decorators.
- `ValidationPipe` global: `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`.
- `StripEmptyStringsPipe` global: Convert chuỗi rỗng `""` → `undefined` (fix Swagger UI issue).
- **CORS:** Whitelist domains qua env `ALLOWED_ORIGINS`. Không mở `origin: true`.

### 7.4 Privilege Matrix

| Module | Privileges |
|---|---|
| Procurement | `VIEW_PO`, `CREATE_PO`, `UPDATE_PO`, `APPROVE_PO`, `EXPORT_PO` |
| WMS | `VIEW_INVENTORY`, `RECEIVE_INBOUND`, `SHIP_OUTBOUND`, `EXPORT_INVENTORY` |
| WMS (Management) | `MANAGE_INBOUND`, `MANAGE_INVENTORY`, `MANAGE_OUTBOUND` |
| Master Data | `MANAGE_PRODUCT`, `MANAGE_SUPPLIER`, `MANAGE_MASTER_DATA`, `IMPORT_MASTER_DATA`, `EXPORT_MASTER_DATA` |
| Admin | `MANAGE_USER`, `MANAGE_ROLE`, `MANAGE_ORGANIZATION` |
| HCM | `MANAGE_EMPLOYEE` |
| TMS | `MANAGE_TMS`, `MANAGE_VEHICLE` |

---

## 8. API Documentation — Swagger (BẮT BUỘC)

### 8.1 Controller Decorators

```typescript
@ApiTags('ModuleName - Mô tả tiếng Việt')  // Nhóm endpoints
@ApiBearerAuth('bearer')                     // Hiện ổ khóa trên Swagger UI
@UseGuards(JwtAuthGuard, PrivilegeGuard)
@Controller('route')
export class XxxController {
  @ApiOperation({ summary: 'Mô tả ngắn gọn' })
  @ApiResponse({ status: 200, description: 'Mô tả response' })
  @Get()
  findAll() {}
}
```

### 8.2 DTO Decorators

```typescript
export class CreateXxxDto {
  @ApiProperty({ description: 'Mô tả', example: 'Giá trị mẫu' })
  @IsString()
  @IsNotEmpty()
  required_field: string;

  @ApiPropertyOptional({ description: 'Mô tả', example: 'Giá trị mẫu' })
  @IsString()
  @IsOptional()
  optional_field?: string;
}
```

### 8.3 UpdateDto Pattern

```typescript
// PHẢI import PartialType từ @nestjs/swagger (KHÔNG phải @nestjs/mapped-types)
// để Swagger UI kế thừa đúng @ApiProperty từ CreateDto
import { PartialType } from '@nestjs/swagger';
```

---

## 9. Coding Standards

### 9.1 TypeScript Strict Mode

- Hạn chế tối đa `any` — dùng typed interfaces/DTOs.
- Enum cho business states (không dùng magic strings).
- Return type tường minh cho service methods khi logic phức tạp.

### 9.2 Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Entity class | PascalCase | `OutboundOrder` |
| Entity table | snake_case (plural) | `outbound_orders` |
| Entity column | snake_case | `order_number`, `qty_on_hand` |
| DTO class | PascalCase + Dto suffix | `CreateOutboundOrderDto` |
| Enum | PascalCase (enum name), UPPER_SNAKE (values) | `OutboundStatus.PICKED` |
| Controller route | kebab-case | `/inbound/line/:lineId/putaway` |
| File name | kebab-case | `outbound-order.entity.ts` |

### 9.3 Error Handling

```typescript
// Dùng NestJS built-in exceptions — GlobalExceptionFilter sẽ wrap thành { status, message, data }
throw new NotFoundException({ status: 'error', message: '...', data: null });
throw new BadRequestException({ status: 'error', message: '...', data: null });
```

### 9.4 Auto-generated Codes

Các mã nghiệp vụ được sinh tự động theo pattern: `PREFIX-YYMMDD-XXX`
- Inbound: `IB-260314-001`
- Outbound: `OB-260314-001`
- Waybill: `WB-260314-XXXX` (random suffix)

---

## 10. Enterprise Business Flows (Oracle Fusion Best Practices)

### SCM & WMS
- **Source-to-Pay (S2P):** Sourcing → PR → PO → Goods Receipt (Inbound) → AP Invoice → Payment
- **Dock-to-Stock:** ASN → Receiving/Staging → QC Inspection → Putaway → Update Inventory
- **Order-to-Fulfillment:** Sales Order → Wave Planning → Picking → Packing → Shipping → Update Inventory
- **Plan-to-Produce:** Demand Plan → Work Order → Material Issue → Production → FG Receipt

### TMS Integration (Dock-to-Door)
1. Order Release → 2. Load Planning (TMS gom đơn, chọn xe) → 3. Wave/Pick (WMS gom theo xe) → 4. Packing & Staging → 5. Dispatch & Shipping (in Waybill, xe rời bãi) → 6. Proof of Delivery (POD)

### ERP Financials
- **Order-to-Cash (O2C):** Sales Order → Fulfillment (WMS) → AR Invoice → Receipt → Bank Reconciliation
- **Record-to-Report (R2R):** Subledger → General Ledger → Journal Entries → Period Close → Financial Reporting

---

## 11. Cross-Stack Synchronization Protocol (BẮT BUỘC — NGHIÊM NGẶT)

> **Nguyên tắc cốt lõi:** Backend và Frontend là MỘT hệ thống thống nhất. Mọi thay đổi backend PHẢI được đồng bộ sang frontend TRƯỚC KHI coi task là hoàn thành. Không có ngoại lệ.

### 11.1 Quy tắc đồng bộ bắt buộc

Khi thay đổi **BẤT KỲ** thành phần nào dưới đây trong `wms-backend`, bạn **PHẢI** chủ động tìm kiếm và cập nhật code tương ứng trong `wms-frontend`:

| Thay đổi Backend | Phải kiểm tra Frontend |
|---|---|
| **Entity** (thêm/sửa/xóa column) | Interfaces/Types TypeScript, form fields, table columns, display components |
| **DTO** (thêm/sửa/xóa field, đổi validation) | Request payloads, form validation schemas, API call bodies |
| **Controller endpoint** (đổi route, method, params, query) | Axios/fetch calls, API hooks, route constants, URL builders |
| **Response format** (đổi cấu trúc data trả về) | Response type interfaces, data destructuring, UI rendering logic |
| **Enum values** (thêm/sửa/xóa trạng thái) | Enum mirrors trong frontend, status badges, dropdown options, filter logic |
| **Privilege/Permission** (thêm quyền mới) | Route guards, menu visibility, button disabled states, permission checks |

### 11.2 Quy trình thực hiện (PHẢI tuân thủ thứ tự)

```
1. Thực hiện thay đổi Backend (entity, DTO, controller, service)
2. Xác định danh sách files Frontend bị ảnh hưởng:
   - Tìm theo tên module: grep -r "moduleName" ../wms-frontend/src/
   - Tìm theo API route: grep -r "/api/route" ../wms-frontend/src/
   - Tìm theo interface/type name: grep -r "InterfaceName" ../wms-frontend/src/
3. Cập nhật TẤT CẢ files Frontend bị ảnh hưởng:
   - TypeScript interfaces/types phải khớp 100% với DTO/Entity mới
   - API calls phải đúng route, method, params mới
   - UI components phải hiển thị đúng fields mới/đã sửa
4. Chạy type-check cả 2 workspaces để verify không có lỗi
5. KHÔNG báo hoàn thành nếu chưa đồng bộ xong frontend
```

### 11.3 Checklist đồng bộ Privileges & Auth

Khi thêm/sửa Privilege trong backend:

- [ ] Cập nhật privilege enum/constants trong frontend
- [ ] Cập nhật route guards (`PrivateRoute`, `ProtectedRoute`) nếu có route mới
- [ ] Cập nhật sidebar/menu visibility dựa trên privilege mới
- [ ] Cập nhật button/action guards (ẩn/hiện nút theo quyền)
- [ ] Verify JWT payload structure vẫn tương thích với frontend auth state

### 11.4 Workspace Paths

```
Backend:  C:\Users\Admin\wms-backend\    (repo hiện tại)
Frontend: C:\Users\Admin\wms-frontend\   (sibling directory)
```

### 11.5 Lệnh verify đồng bộ

```bash
# Sau MỌI thay đổi cross-stack, PHẢI chạy:
cd C:\Users\Admin\wms-backend && npm run build          # Backend compile check
cd C:\Users\Admin\wms-frontend && npx tsc --noEmit      # Frontend type check

# Nếu một trong hai FAIL → FIX trước khi hoàn thành task
```

### 11.6 Vi phạm nghiêm trọng (TUYỆT ĐỐI KHÔNG ĐƯỢC)

- **CẤM** hoàn thành task backend mà chưa kiểm tra frontend impact
- **CẤM** thêm endpoint/field mới mà không tạo/cập nhật interface frontend tương ứng
- **CẤM** đổi tên route/field mà không update tất cả API calls frontend
- **CẤM** thêm Privilege mới mà không đồng bộ permission checks frontend
- **CẤM** xóa/rename enum value mà không cập nhật mapping frontend
