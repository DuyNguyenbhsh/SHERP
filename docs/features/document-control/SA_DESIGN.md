# SA_DESIGN: Module Document Control — SH-GROUP ERP

> **Tham chiếu:** `BA_SPEC.md` (cùng thư mục)
> **Ngày thiết kế:** 2026-04-14
> **Trạng thái:** Gate 2 — SA DESIGN
> **Nguyên tắc:** Clean Architecture + Reuse module `documents/` & `approvals/` hiện có — KHÔNG duplicate

---

## 1. NGUYÊN TẮC THIẾT KẾ

1. **Extend, do not rebuild:** Mở rộng `documents/` module hiện tại. KHÔNG tạo module mới.
2. **Polymorphic approval:** Tái sử dụng `ApprovalRequest.entity_type + entity_id` (pattern đã có). CHỈ thêm value mới `DOCUMENT_VERSION` vào enum.
3. **Append-only:** Versions & audit log là immutable — chỉ INSERT.
4. **Soft coupling with Cloudinary:** Abstract upload qua `CloudinaryService` — nếu sau này đổi R2 chỉ swap service.
5. **Transaction safety:** Upload version + approval submission wrap trong `DataSource.transaction()`.

---

## 2. ERD — MỞ RỘNG SCHEMA

### 2.1 Diagram (textual)

```
┌──────────────────┐    1:N    ┌──────────────────────┐
│ ProjectFolder    │──────────▶│  ProjectDocument     │  (EXISTING, extended)
│ (EXISTING)       │           │  + current_version_id│
└──────────────────┘           │  + approved_version_id│
                               │  + status (enum mở)   │
                               └─────────┬────────────┘
                                         │ 1:N
                                         ▼
                               ┌──────────────────────┐
                               │  DocumentVersion     │  (NEW)
                               │  id, document_id     │
                               │  version_number      │
                               │  file_url (Cloudinary)│
                               │  checksum (SHA-256)   │
                               │  change_note, uploader│
                               │  source_version_id   │ ← rollback tracking
                               └─────────┬────────────┘
                                         │ 1:N (polymorphic)
                                         ▼
                               ┌──────────────────────┐
                               │  ApprovalRequest     │  (EXISTING)
                               │  entity_type = 'DOCUMENT_VERSION'
                               │  entity_id   = version.id
                               └──────────────────────┘

┌──────────────────────┐
│  DocumentAuditLog    │  (NEW — polymorphic, async-written)
│  entity_type, entity_id, action, actor_id
│  old_data (jsonb), new_data (jsonb)
│  ip, user_agent, created_at
└──────────────────────┘
```

### 2.2 Bảng MỚI: `document_versions`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | `gen_random_uuid()` |
| `document_id` | UUID FK → `project_documents.id` ON DELETE CASCADE | |
| `version_number` | VARCHAR(10) | Ví dụ: `V1.0`, `V1.1`, `V2.0` |
| `version_seq` | INT | Tự tăng per document — dùng cho ORDER BY nhanh |
| `file_url` | TEXT | Cloudinary secure URL |
| `file_name` | VARCHAR(500) | Tên file gốc |
| `file_size` | BIGINT | Bytes |
| `mime_type` | VARCHAR(100) | |
| `checksum` | VARCHAR(64) | SHA-256 hex |
| `change_note` | TEXT NOT NULL | BR-DOC-02 |
| `source_version_id` | UUID FK → `document_versions.id` NULL | Nếu là rollback |
| `uploaded_by` | UUID FK → `users.id` | |
| `is_archived` | BOOLEAN DEFAULT false | |
| `created_at` | TIMESTAMPTZ | |

**Indexes:**
- `UNIQUE(document_id, version_seq)` — đảm bảo tăng dần
- `IDX_DOCVER_CHECKSUM` on `checksum` — detect duplicate
- `IDX_DOCVER_DOCUMENT` on `document_id, version_seq DESC` — query version mới nhất nhanh

### 2.3 Extend `project_documents`

Thêm columns:
| Column | Type | Notes |
|---|---|---|
| `current_version_id` | UUID FK → `document_versions.id` NULL | Version mới nhất |
| `approved_version_id` | UUID FK → `document_versions.id` NULL | Version cuối đã duyệt |
| `doc_type` | VARCHAR(50) | Phân loại: `CONTRACT`, `TECHNICAL`, `QUALITY`, `REPORT`, `CERTIFICATE` (optional) |
| `tags` | TEXT[] | Mảng tags, GIN indexed |
| `search_vector` | tsvector | Generated column cho full-text search |

**Extend enum `DocumentStatus`:**
```typescript
export enum DocumentStatus {
  VALID = 'VALID',
  EXPIRING_SOON = 'EXPIRING_SOON',
  EXPIRED = 'EXPIRED',
  // MỚI:
  DRAFT = 'DRAFT',                   // Upload xong, chưa submit duyệt
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED',
}
```

### 2.4 Bảng MỚI: `document_audit_logs`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `entity_type` | VARCHAR(50) | `DOCUMENT` hoặc `DOCUMENT_VERSION` |
| `entity_id` | UUID | |
| `action` | VARCHAR(50) | `CREATED`, `UPLOADED_VERSION`, `VIEWED`, `DOWNLOADED`, `SUBMITTED_APPROVAL`, `APPROVED`, `REJECTED`, `ROLLBACK`, `ARCHIVED` |
| `actor_id` | UUID FK → `users.id` | |
| `old_data` | JSONB NULL | |
| `new_data` | JSONB NULL | |
| `ip` | VARCHAR(45) | |
| `user_agent` | TEXT | |
| `created_at` | TIMESTAMPTZ | BRIN index (time-series) |

**Indexes:**
- `IDX_DOCAUDIT_ENTITY` on `(entity_type, entity_id)`
- `IDX_DOCAUDIT_ACTOR` on `actor_id`
- `BRIN(created_at)` — tiết kiệm storage cho time-series

**Constraint:** Chỉ INSERT — không tạo UPDATE/DELETE endpoint (BR-DOC-13).

### 2.5 Extend enum `ApprovalEntityType`

```typescript
export enum ApprovalEntityType {
  PROJECT_BUDGET = 'PROJECT_BUDGET',
  PROJECT_STAGE = 'PROJECT_STAGE',
  OUTBOUND_ORDER = 'OUTBOUND_ORDER',
  PURCHASE_ORDER = 'PURCHASE_ORDER',
  GENERAL = 'GENERAL',
  DOCUMENT_VERSION = 'DOCUMENT_VERSION',  // MỚI
}
```

**Không cần bảng bridge** — dùng polymorphic: `ApprovalRequest.entity_type='DOCUMENT_VERSION'`, `entity_id=version.id`.

---

## 3. API ENDPOINTS

### 3.1 Sprint 1 — Upload & Version Foundation

| Method | Route | Privilege | Description |
|---|---|---|---|
| POST | `/projects/:projectId/documents/:documentId/versions` | `MANAGE_PROJECTS` hoặc owner | Upload version mới (multipart/form-data) |
| GET | `/documents/:documentId/versions` | viewer | List versions của document |
| GET | `/documents/:documentId/versions/:versionId` | viewer | Chi tiết version + download URL |

### 3.2 Sprint 2 — Version History & Rollback

| Method | Route | Privilege | Description |
|---|---|---|---|
| POST | `/documents/:documentId/versions/:versionId/rollback` | `MANAGE_PROJECTS` | Rollback về version này (tạo version mới) |
| PATCH | `/documents/:documentId/versions/:versionId/archive` | `MANAGE_PROJECTS` | Đánh dấu archived |

### 3.3 Sprint 3 — Approval Integration

| Method | Route | Privilege | Description |
|---|---|---|---|
| POST | `/documents/:documentId/versions/:versionId/submit-approval` | `MANAGE_PROJECTS` | Gửi duyệt — tạo ApprovalRequest(entity_type=DOCUMENT_VERSION) |
| GET | `/documents/:documentId/approval-status` | viewer | Trạng thái duyệt hiện tại + lịch sử |

> **Note:** Các endpoint approve/reject từng step đã có sẵn trong `approvals/` module → tái sử dụng.

### 3.4 Sprint 4 — Search & Audit

| Method | Route | Privilege | Description |
|---|---|---|---|
| GET | `/documents/search` | viewer | Full-text search với filter panel |
| GET | `/documents/:documentId/audit-logs` | `VIEW_AUDIT` (privilege mới) | Timeline các events |
| GET | `/documents/audit/export` | `VIEW_AUDIT` | Export CSV audit logs |

### 3.5 Response Format (chuẩn `{status, message, data}`)

```typescript
// Ví dụ response upload version
{
  status: 'success',
  message: 'Tải lên phiên bản V1.2 thành công',
  data: {
    version_id: 'uuid',
    version_number: 'V1.2',
    version_seq: 3,
    file_url: 'https://res.cloudinary.com/...',
    checksum: 'abc123...',
    uploaded_at: '2026-04-14T10:00:00Z'
  }
}
```

---

## 4. DTOs

### 4.1 `UploadVersionDto`
```typescript
export class UploadVersionDto {
  @ApiProperty({ description: 'Ghi chú thay đổi', example: 'Cập nhật BOQ theo CĐT v2' })
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  change_note: string;

  // file multipart handled bởi FileInterceptor, không trong DTO
}
```

### 4.2 `RollbackVersionDto`
```typescript
export class RollbackVersionDto {
  @ApiProperty({ example: 'Rollback do lỗi tính toán' })
  @IsString()
  @MinLength(10)
  reason: string;
}
```

### 4.3 `SubmitApprovalDto`
```typescript
export class SubmitApprovalDto {
  @ApiProperty({ description: 'ID cấu hình workflow duyệt' })
  @IsUUID()
  approval_config_id: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string;
}
```

### 4.4 `DocumentSearchDto`
```typescript
export class DocumentSearchDto {
  @IsString() @IsOptional() keyword?: string;
  @IsUUID() @IsOptional() project_id?: string;
  @IsEnum(DocumentStatus) @IsOptional() status?: DocumentStatus;
  @IsString() @IsOptional() doc_type?: string;
  @IsArray() @IsOptional() tags?: string[];
  @IsDateString() @IsOptional() from_date?: string;
  @IsDateString() @IsOptional() to_date?: string;
  @IsInt() @Min(1) @Max(100) @IsOptional() limit?: number = 20;
  @IsInt() @Min(0) @IsOptional() offset?: number = 0;
}
```

---

## 5. CLEAN ARCHITECTURE — FOLDER STRUCTURE

```
wms-backend/src/documents/
├── entities/
│   ├── project-folder.entity.ts          (EXISTING)
│   ├── project-document.entity.ts        (EXTEND — thêm columns)
│   ├── document-notification.entity.ts   (EXISTING)
│   ├── document-version.entity.ts        (NEW)
│   └── document-audit-log.entity.ts      (NEW)
├── dto/
│   ├── create-document.dto.ts            (EXISTING)
│   ├── update-document.dto.ts            (EXISTING)
│   ├── upload-version.dto.ts             (NEW — S1)
│   ├── rollback-version.dto.ts           (NEW — S2)
│   ├── submit-approval.dto.ts            (NEW — S3)
│   └── document-search.dto.ts            (NEW — S4)
├── enums/
│   └── document.enum.ts                  (EXTEND — thêm status + action)
├── domain/
│   └── logic/
│       ├── version-number.calculator.ts  (NEW — tính V1.0 → V1.1)
│       └── checksum.calculator.ts        (NEW — SHA-256)
├── services/
│   ├── documents.service.ts              (EXISTING — extend)
│   ├── document-versions.service.ts      (NEW — S1-S2)
│   ├── document-approval.service.ts      (NEW — S3, gọi ApprovalsService)
│   ├── document-search.service.ts        (NEW — S4)
│   └── document-audit.service.ts         (NEW — S4)
├── interceptors/
│   └── audit.interceptor.ts              (NEW — S4, log async)
├── documents.controller.ts               (EXISTING — extend routes)
├── document-versions.controller.ts       (NEW — optional split)
└── documents.module.ts                   (EXTEND — register new providers)
```

**Domain Logic tách riêng** (theo SA rule cấm Fat Service):
- `version-number.calculator.ts` — pure function tính version mới
- `checksum.calculator.ts` — pure function SHA-256

---

## 6. TRANSACTION BOUNDARIES

Theo CLAUDE.md section 6 — các thao tác sau PHẢI wrap trong `DataSource.transaction()`:

| Thao tác | Bước |
|---|---|
| **Upload version** | 1) INSERT `document_versions` → 2) UPDATE `project_documents.current_version_id` → 3) INSERT audit log |
| **Rollback** | 1) Lock parent document row (FOR UPDATE) → 2) Check status ≠ PENDING_APPROVAL → 3) INSERT new version với source_version_id → 4) UPDATE current_version_id → 5) INSERT audit log |
| **Submit approval** | 1) Check 1 active request/version → 2) INSERT ApprovalRequest → 3) UPDATE document.status=PENDING_APPROVAL → 4) INSERT audit log |
| **Approval webhook (khi APPROVED)** | 1) UPDATE ApprovalRequest.status → 2) UPDATE document.approved_version_id + status=APPROVED → 3) INSERT audit log → 4) Notify uploader |

---

## 7. FULL-TEXT SEARCH STRATEGY

### 7.1 PostgreSQL Extensions
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;  -- Hỗ trợ tiếng Việt không dấu
```

### 7.2 Generated Column
```sql
ALTER TABLE project_documents ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', coalesce(document_name, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(notes, '')), 'B') ||
  setweight(to_tsvector('simple', array_to_string(coalesce(tags, ARRAY[]::text[]), ' ')), 'C')
) STORED;

CREATE INDEX IDX_DOCS_SEARCH ON project_documents USING GIN(search_vector);
CREATE INDEX IDX_DOCS_TAGS_GIN ON project_documents USING GIN(tags);
```

### 7.3 Query Pattern
```typescript
this.repo.createQueryBuilder('d')
  .where(`d.search_vector @@ plainto_tsquery('simple', unaccent(:keyword))`, { keyword })
  .orderBy(`ts_rank(d.search_vector, plainto_tsquery('simple', unaccent(:keyword)))`, 'DESC')
```

**Mục tiêu:** < 1 giây với 10,000 documents (theo BA acceptance criteria US-DOC-04).

---

## 8. SECURITY & AUTHORIZATION

### 8.1 Privilege Matrix (mở rộng)

| Privilege | Phạm vi |
|---|---|
| `MANAGE_PROJECTS` (đã có) | Upload/Rollback/Archive document |
| `VIEW_AUDIT` (MỚI) | Xem audit log chi tiết, export CSV |

### 8.2 Row-level Access
- User chỉ truy cập documents của project mà họ có assignment (qua `project_assignments` hoặc `project_members`)
- Áp dụng qua service layer — filter trong query, KHÔNG dựa vào client

### 8.3 Upload Security
- File size max: **50MB** (validate trước Cloudinary upload)
- Mime-type whitelist: `pdf, docx, xlsx, pptx, jpg, png, dwg, dxf, zip`
- Cloudinary upload qua backend (signed upload) — không cho client upload trực tiếp để tránh lộ API secret

---

## 9. AUDIT — ASYNC WRITE STRATEGY

Theo BR-DOC-14, audit log KHÔNG được block API response:

**Option A (MVP — đơn giản):** Dùng `setImmediate()` trong `DocumentAuditService.log()`:
```typescript
log(data: AuditLogDto) {
  setImmediate(() => this.auditRepo.insert(data).catch(err => logger.error(err)));
}
```

**Option B (Phase B — robust):** Bull Queue + Redis (dời sang Phase B).

→ **Chọn Option A cho MVP** — đơn giản, không thêm dependency.

---

## 10. TESTING STRATEGY (cho Gate 4)

### 10.1 Unit Tests (100% coverage cho domain logic)
- `version-number.calculator.spec.ts` — V1.0 → V1.1, V1.9 → V1.10, rollback edge cases
- `checksum.calculator.spec.ts` — SHA-256 determinism, empty file

### 10.2 Service Tests (Mock Repository)
- `document-versions.service.spec.ts` — upload, duplicate checksum rejection, rollback creates new version
- `document-approval.service.spec.ts` — submit, status transition, 1-active-request constraint
- `document-search.service.spec.ts` — keyword, tags, date range, project filter

### 10.3 Integration Tests (Real DB)
- Full flow: Upload V1.0 → Upload V1.1 → Submit Approval → Approve → Rollback V1.0
- Concurrent upload race condition (2 uploads cùng lúc → 1 thành công, 1 reject hoặc tạo V1.1 + V1.2)
- Search performance với 10K records seeded

### 10.4 Manual UI Verification (theo test-rules.md)
- Upload component, version history panel, search bar, audit timeline
- DB state verification sau mỗi flow

---

## 11. MIGRATION PLAN (Gate 5)

**Migration file: `YYYYMMDDHHMMSS-DocumentControlV2.ts`**

Thứ tự an toàn (zero data loss):
1. `CREATE EXTENSION pg_trgm, unaccent`
2. `CREATE TABLE document_versions`
3. `CREATE TABLE document_audit_logs`
4. `ALTER TABLE project_documents ADD COLUMN current_version_id UUID NULL` (nullable trước)
5. `ALTER TABLE project_documents ADD COLUMN approved_version_id UUID NULL`
6. `ALTER TABLE project_documents ADD COLUMN doc_type VARCHAR(50) NULL`
7. `ALTER TABLE project_documents ADD COLUMN tags TEXT[] NULL`
8. `ALTER TABLE project_documents ADD COLUMN search_vector tsvector GENERATED ...`
9. Data migration: với mỗi `project_documents` có `file_url` → tạo `document_versions` V1.0
10. `CREATE INDEX` các indexes
11. Update `DocumentStatus` enum (add DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, ARCHIVED)

**Down migration:** DROP theo thứ tự ngược — tested trên Neon branch trước khi apply main.

---

## 12. ẢNH HƯỞNG CROSS-MODULE (ERP Impact Radar)

| Module bị ảnh hưởng | Ảnh hưởng | Action |
|---|---|---|
| `approvals/` | Thêm enum value `DOCUMENT_VERSION` | Update `approval.enum.ts` |
| `projects/` | Không ảnh hưởng trực tiếp | — |
| Frontend — `pages/documents/` | UI mới: Version panel, Search, Audit tab | Sprint 1-4 sync |
| Frontend — Types | Thêm interfaces `DocumentVersion`, `DocumentAuditLog` | Mỗi sprint |
| `seed/` | Seed mẫu: 3 documents × 3 versions cho dev | Sprint 1 |

---

## 13. CHECKLIST HOÀN THÀNH GATE 2

- [x] Entity và quan hệ Database (ERD) đã xác định (2 tables mới + extend 1 table)
- [x] API Endpoints đã liệt kê (theo 4 sprints)
- [x] Interface và DTOs đã định nghĩa (4 DTOs mới)
- [x] Clean Architecture folder structure rõ ràng (domain logic tách riêng)
- [x] Tối ưu truy vấn (GIN, BRIN, UNIQUE indexes)
- [x] Transaction boundaries xác định (4 thao tác critical)
- [x] Không có Fat Service (domain logic → `domain/logic/`)
- [x] Migration plan an toàn (11 bước, có rollback)
- [x] Cross-module impact đã đánh giá

---

**Next Gate:** Gate 3 — DEV (Sprint 1: Migration + DocumentVersion entity + Upload endpoint)
