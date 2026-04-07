# SA_DESIGN: Module Quan ly Du an — Mo rong theo ERP Central

> **Ngay thiet ke:** 2026-04-06
> **Trang thai:** Gate 2 — SA Design
> **Nguon BA:** docs/features/project-management/BA_SPEC.md

---

## 1. TONG QUAN THAY DOI

### 1.1 Mo rong entity hien co

| Entity | Thay doi | Chi tiet |
|--------|----------|----------|
| `Project` | Them 10 fields | contract_number, contract_value, contract_date, bid_date, bid_result_date, lost_bid_reason, risk_assessment, warranty_start, warranty_end, retention_rate |
| `ProjectStatus` enum | 5 → 11 trang thai | Them BIDDING, WON_BID, LOST_BID, SETTLING, SETTLED, WARRANTY, RETENTION_RELEASED |
| `ProjectStage` enum | Giu nguyen | PLANNING, PERMITTING, CONSTRUCTION, MANAGEMENT |

### 1.2 Entity moi

| Entity | Table | Module |
|--------|-------|--------|
| `NonConformanceReport` | `non_conformance_reports` | projects/ |
| `NcrAttachment` | `ncr_attachments` | projects/ |
| `WorkItemMaster` | `work_item_masters` | projects/ |
| `SubcontractorKpi` | `subcontractor_kpis` | projects/ |

### 1.3 Module/Service moi

| Service | Trach nhiem |
|---------|-------------|
| `ProjectNcrService` | CRUD NCR, phan cong, xu ly, verify |
| `WorkItemService` | CRUD Work Item master data |
| `SubcontractorKpiService` | Danh gia NCC/NTP dinh ky |

---

## 2. DATABASE SCHEMA

### 2.1 Mo rong `projects` table

```sql
ALTER TABLE projects
  ADD COLUMN project_type VARCHAR(30) DEFAULT 'CONSTRUCTION',
  ADD COLUMN bid_date DATE,
  ADD COLUMN bid_result_date DATE,
  ADD COLUMN lost_bid_reason TEXT,
  ADD COLUMN contract_number VARCHAR(100),
  ADD COLUMN contract_value DECIMAL(18,2),
  ADD COLUMN contract_date DATE,
  ADD COLUMN risk_assessment JSONB,
  ADD COLUMN warranty_start DATE,
  ADD COLUMN warranty_end DATE,
  ADD COLUMN retention_rate DECIMAL(5,2) DEFAULT 5.00;
```

### 2.2 Mo rong `ProjectStatus` enum

```typescript
export enum ProjectStatus {
  DRAFT = 'DRAFT',
  BIDDING = 'BIDDING',
  WON_BID = 'WON_BID',
  LOST_BID = 'LOST_BID',
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  SETTLING = 'SETTLING',
  SETTLED = 'SETTLED',
  WARRANTY = 'WARRANTY',
  RETENTION_RELEASED = 'RETENTION_RELEASED',
  CANCELED = 'CANCELED',
}
```

### 2.3 Status Transitions (State Machine)

```typescript
export const PROJECT_STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  [ProjectStatus.DRAFT]:                [ProjectStatus.BIDDING, ProjectStatus.ACTIVE, ProjectStatus.CANCELED],
  [ProjectStatus.BIDDING]:              [ProjectStatus.WON_BID, ProjectStatus.LOST_BID, ProjectStatus.CANCELED],
  [ProjectStatus.WON_BID]:             [ProjectStatus.ACTIVE, ProjectStatus.CANCELED],
  [ProjectStatus.LOST_BID]:            [],  // Terminal
  [ProjectStatus.ACTIVE]:              [ProjectStatus.ON_HOLD, ProjectStatus.SETTLING, ProjectStatus.CANCELED],
  [ProjectStatus.ON_HOLD]:             [ProjectStatus.ACTIVE, ProjectStatus.CANCELED],
  [ProjectStatus.SETTLING]:            [ProjectStatus.SETTLED, ProjectStatus.ACTIVE],
  [ProjectStatus.SETTLED]:             [ProjectStatus.WARRANTY],
  [ProjectStatus.WARRANTY]:            [ProjectStatus.RETENTION_RELEASED],
  [ProjectStatus.RETENTION_RELEASED]:  [],  // Terminal — dong du an
  [ProjectStatus.CANCELED]:            [],  // Terminal
};
```

### 2.4 `ProjectType` enum (moi)

```typescript
export enum ProjectType {
  CONSTRUCTION = 'CONSTRUCTION',      // Xay lap
  DESIGN_BUILD = 'DESIGN_BUILD',      // Thiet ke va thi cong (D&B)
  MEP = 'MEP',                        // Co dien
  EPC = 'EPC',                        // Thiet ke + cung cap + xay lap
}
```

### 2.5 `non_conformance_reports` table

```sql
CREATE TABLE non_conformance_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ncr_code VARCHAR(50) NOT NULL UNIQUE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Phan loai
  category VARCHAR(20) NOT NULL,       -- QUALITY | SCHEDULE | SAFETY
  severity VARCHAR(20) NOT NULL,       -- GREEN | YELLOW | ORANGE | RED | CRITICAL
  related_type VARCHAR(20),            -- TASK | WORK_ITEM | SUBCONTRACT | PROJECT | COMPANY
  related_id VARCHAR(255),

  -- Noi dung
  description TEXT NOT NULL,
  location_detail VARCHAR(255),

  -- Phan cong
  assigned_to UUID REFERENCES employees(id),
  assigned_by UUID REFERENCES employees(id),

  -- Xu ly
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN',  -- OPEN | IN_PROGRESS | RESOLVED | VERIFIED | CLOSED
  resolution_note TEXT,
  verified_by UUID REFERENCES employees(id),
  verified_at TIMESTAMP,

  -- Phat
  penalty_amount DECIMAL(18,2) DEFAULT 0,
  subcontract_id UUID,                 -- Loose FK → hop dong thau phu

  -- Audit
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ncr_project ON non_conformance_reports(project_id);
CREATE INDEX idx_ncr_status ON non_conformance_reports(status);
CREATE INDEX idx_ncr_category ON non_conformance_reports(category);
```

### 2.6 `ncr_attachments` table

```sql
CREATE TABLE ncr_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ncr_id UUID NOT NULL REFERENCES non_conformance_reports(id) ON DELETE CASCADE,
  phase VARCHAR(10) NOT NULL,          -- BEFORE | AFTER
  file_url VARCHAR(500) NOT NULL,      -- Cloud URL (Cloudinary/S3)
  file_name VARCHAR(255),
  uploaded_by UUID,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ncr_att_ncr ON ncr_attachments(ncr_id);
```

### 2.7 `work_item_masters` table

```sql
CREATE TABLE work_item_masters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_code VARCHAR(50) NOT NULL UNIQUE,
  item_name VARCHAR(255) NOT NULL,
  unit VARCHAR(30),
  item_group VARCHAR(100),
  specifications JSONB,                -- Tieu chuan ky thuat
  inspection_checklist JSONB,          -- ITP checklist
  reference_images JSONB,              -- [{url, caption}]
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2.8 `subcontractor_kpis` table

```sql
CREATE TABLE subcontractor_kpis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  evaluation_period VARCHAR(20),       -- '2026-H1', '2026-H2'
  evaluation_date DATE NOT NULL,
  criteria JSONB NOT NULL,             -- [{name, weight, score, max_score}]
  total_score DECIMAL(5,2),
  result VARCHAR(10) NOT NULL,         -- PASS | FAIL
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_kpi_supplier ON subcontractor_kpis(supplier_id);
```

---

## 3. ERD — QUAN HE GIUA CAC ENTITY

```
projects (mo rong)
  ├── 1:N  non_conformance_reports
  │         └── 1:N  ncr_attachments
  ├── 1:N  project_wbs
  │         └── 1:N  project_boq_items
  │                   └── N:1  work_item_masters (loose FK qua item_code)
  ├── 1:N  project_assignments
  ├── 1:N  project_budgets
  ├── 1:N  project_transactions
  ├── 1:N  project_settlements
  ├── N:1  suppliers (investor)
  └── N:1  employees (manager)

suppliers
  └── 1:N  subcontractor_kpis
```

---

## 4. API ENDPOINTS

### 4.1 NCR Endpoints (trong ProjectsController hoac tach NcrController)

```
POST   /projects/:projectId/ncrs                    — Tao NCR moi
GET    /projects/:projectId/ncrs                     — Danh sach NCR theo du an
GET    /projects/:projectId/ncrs/:ncrId              — Chi tiet NCR
PATCH  /projects/:projectId/ncrs/:ncrId              — Cap nhat NCR
PATCH  /projects/:projectId/ncrs/:ncrId/assign       — Phan cong nguoi xu ly
PATCH  /projects/:projectId/ncrs/:ncrId/resolve      — Ghi nhan da xu ly
PATCH  /projects/:projectId/ncrs/:ncrId/verify       — Kiem tra chap nhan (dong NCR)
PATCH  /projects/:projectId/ncrs/:ncrId/reopen       — Mo lai NCR
POST   /projects/:projectId/ncrs/:ncrId/attachments  — Upload hinh (multipart/form-data)
DELETE /projects/:projectId/ncrs/:ncrId/attachments/:attId — Xoa hinh
GET    /projects/:projectId/ncrs/summary             — Thong ke NCR
```

### 4.2 Work Item Master Endpoints

```
POST   /work-items                    — Tao cong tac moi
GET    /work-items                    — Danh sach (co search, filter group)
GET    /work-items/:id                — Chi tiet
PATCH  /work-items/:id                — Cap nhat
DELETE /work-items/:id                — Vo hieu hoa (soft)
```

### 4.3 Subcontractor KPI Endpoints

```
POST   /suppliers/:supplierId/kpis              — Tao danh gia moi
GET    /suppliers/:supplierId/kpis              — Lich su danh gia
GET    /suppliers/:supplierId/kpis/latest       — Danh gia gan nhat
PATCH  /suppliers/:supplierId/kpis/:kpiId       — Cap nhat
PATCH  /suppliers/:supplierId/kpis/:kpiId/approve — Duyet danh gia
GET    /suppliers/kpis/failed                   — DS NCC/NTP khong dat
```

### 4.4 Mo rong Project Endpoints

```
PATCH  /projects/:id/bid-result       — Ghi nhan ket qua thau (WON_BID / LOST_BID)
PATCH  /projects/:id/contract         — Cap nhat thong tin hop dong CĐT
PATCH  /projects/:id/warranty         — Cap nhat thong tin bao hanh
```

---

## 5. DTOs

### 5.1 NCR DTOs

```typescript
// create-ncr.dto.ts
export class CreateNcrDto {
  @IsEnum(NcrCategory)
  category: NcrCategory;              // QUALITY | SCHEDULE | SAFETY

  @IsEnum(NcrSeverity)
  severity: NcrSeverity;              // GREEN | YELLOW | ORANGE | RED | CRITICAL

  @IsString() @IsNotEmpty()
  description: string;

  @IsOptional() @IsEnum(NcrRelatedType)
  related_type?: NcrRelatedType;

  @IsOptional() @IsString()
  related_id?: string;

  @IsOptional() @IsString()
  location_detail?: string;
}

// assign-ncr.dto.ts
export class AssignNcrDto {
  @IsUUID()
  assigned_to: string;
}

// resolve-ncr.dto.ts
export class ResolveNcrDto {
  @IsString() @IsNotEmpty()
  resolution_note: string;
}

// verify-ncr.dto.ts
export class VerifyNcrDto {
  @IsBoolean()
  accepted: boolean;

  @IsOptional() @IsString()
  comment?: string;
}
```

### 5.2 Work Item DTOs

```typescript
export class CreateWorkItemDto {
  @IsString() @IsNotEmpty() @MaxLength(50)
  item_code: string;

  @IsString() @IsNotEmpty() @MaxLength(255)
  item_name: string;

  @IsOptional() @IsString() @MaxLength(30)
  unit?: string;

  @IsOptional() @IsString() @MaxLength(100)
  item_group?: string;

  @IsOptional()
  specifications?: Record<string, unknown>;

  @IsOptional()
  inspection_checklist?: Record<string, unknown>[];
}
```

### 5.3 Subcontractor KPI DTOs

```typescript
export class CreateSubcontractorKpiDto {
  @IsOptional() @IsUUID()
  project_id?: string;

  @IsString()
  evaluation_period: string;           // '2026-H1'

  @IsDateString()
  evaluation_date: string;

  @IsArray() @ValidateNested({ each: true })
  @Type(() => KpiCriterionDto)
  criteria: KpiCriterionDto[];

  @IsOptional() @IsString()
  notes?: string;
}

export class KpiCriterionDto {
  @IsString()
  name: string;

  @IsNumber() @Min(0) @Max(100)
  weight: number;

  @IsNumber() @Min(0)
  score: number;

  @IsNumber() @Min(0)
  max_score: number;
}
```

### 5.4 Mo rong Project DTOs

```typescript
// update-bid-result.dto.ts
export class UpdateBidResultDto {
  @IsEnum(['WON_BID', 'LOST_BID'])
  result: 'WON_BID' | 'LOST_BID';

  @IsOptional() @IsDateString()
  bid_result_date?: string;

  @IsOptional() @IsString()
  lost_bid_reason?: string;
}

// update-contract.dto.ts
export class UpdateContractDto {
  @IsOptional() @IsString() @MaxLength(100)
  contract_number?: string;

  @IsOptional() @IsNumber() @Min(0)
  contract_value?: number;

  @IsOptional() @IsDateString()
  contract_date?: string;
}
```

---

## 6. NCR ENUMS

```typescript
export enum NcrCategory {
  QUALITY = 'QUALITY',
  SCHEDULE = 'SCHEDULE',
  SAFETY = 'SAFETY',
}

export enum NcrSeverity {
  GREEN = 'GREEN',
  YELLOW = 'YELLOW',
  ORANGE = 'ORANGE',
  RED = 'RED',
  CRITICAL = 'CRITICAL',
}

export enum NcrStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  VERIFIED = 'VERIFIED',
  CLOSED = 'CLOSED',
}

export enum NcrRelatedType {
  TASK = 'TASK',
  WORK_ITEM = 'WORK_ITEM',
  SUBCONTRACT = 'SUBCONTRACT',
  PROJECT = 'PROJECT',
  COMPANY = 'COMPANY',
}

export const NCR_STATUS_TRANSITIONS: Record<NcrStatus, NcrStatus[]> = {
  [NcrStatus.OPEN]:        [NcrStatus.IN_PROGRESS],
  [NcrStatus.IN_PROGRESS]: [NcrStatus.RESOLVED],
  [NcrStatus.RESOLVED]:    [NcrStatus.VERIFIED, NcrStatus.IN_PROGRESS],  // reject → quay lai xu ly
  [NcrStatus.VERIFIED]:    [NcrStatus.CLOSED],
  [NcrStatus.CLOSED]:      [NcrStatus.OPEN],  // reopen
};
```

---

## 7. CLOUD UPLOAD STRATEGY

### 7.1 Service: `CloudStorageService`

```typescript
// shared/services/cloud-storage.service.ts
@Injectable()
export class CloudStorageService {
  // Upload file to Cloudinary (or S3)
  async upload(file: Express.Multer.File, folder: string): Promise<CloudUploadResult>;

  // Delete file by public ID
  async delete(publicId: string): Promise<void>;
}

interface CloudUploadResult {
  url: string;
  public_id: string;
  file_name: string;
  file_size: number;
}
```

### 7.2 Env vars can thiet

```
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
```

---

## 8. TICH HOP VOI MODULE HIEN CO

### 8.1 Approvals Module

Them ApprovalEntityType moi:

```typescript
export enum ApprovalEntityType {
  // ... existing
  PROJECT_BID = 'PROJECT_BID',           // Duyet tham gia dau thau
  PROJECT_NCR_PENALTY = 'PROJECT_NCR_PENALTY',  // Duyet tien phat NCR
  SUBCONTRACTOR_KPI = 'SUBCONTRACTOR_KPI',      // Duyet danh gia NCC/NTP
}
```

### 8.2 Suppliers Module

- Them relation: `Supplier.kpis` (OneToMany → SubcontractorKpi)
- Them field: `Supplier.is_blacklisted` (boolean) — khi KPI FAIL duoc duyet

### 8.3 Project Requests Module

- Cap nhat: Khi `approveExec()` → tao Project voi `status = BIDDING` (thay vi DRAFT)
- Them field: `project_type` vao `ProjectRequest`

### 8.4 Frontend Impact

| Component | Thay doi |
|-----------|----------|
| Project status badges | Them 6 trang thai moi voi mau sac tuong ung |
| Project form | Them fields: project_type, contract_*, bid_*, warranty_*, retention_rate |
| NCR management page | **Moi hoan toan** — list, create, detail, assign, resolve, verify |
| Work Item master page | **Moi** — CRUD cong tac |
| Supplier KPI tab | **Moi** — danh gia, lich su, approve |
| Project status flow diagram | Cap nhat 11 trang thai |

---

## 9. MIGRATION PLAN

```
Migration 1: ExpandProjectStatusAndFields
  - ALTER projects: them 10 columns
  - UPDATE existing COMPLETED → SETTLED (data migration)

Migration 2: CreateNcrTables
  - CREATE non_conformance_reports
  - CREATE ncr_attachments

Migration 3: CreateWorkItemMasters
  - CREATE work_item_masters

Migration 4: CreateSubcontractorKpis
  - CREATE subcontractor_kpis
  - ALTER suppliers: them is_blacklisted
```

---

## 10. FOLDER STRUCTURE

```
src/projects/
  ├── entities/
  │     ├── project.entity.ts              (mo rong)
  │     ├── non-conformance-report.entity.ts   (moi)
  │     ├── ncr-attachment.entity.ts            (moi)
  │     ├── work-item-master.entity.ts          (moi)
  │     ├── subcontractor-kpi.entity.ts         (moi)
  │     └── ... (existing)
  ├── dto/
  │     ├── create-ncr.dto.ts                   (moi)
  │     ├── assign-ncr.dto.ts                   (moi)
  │     ├── resolve-ncr.dto.ts                  (moi)
  │     ├── verify-ncr.dto.ts                   (moi)
  │     ├── create-work-item.dto.ts             (moi)
  │     ├── create-subcontractor-kpi.dto.ts     (moi)
  │     ├── update-bid-result.dto.ts            (moi)
  │     ├── update-contract.dto.ts              (moi)
  │     └── ... (existing)
  ├── enums/
  │     ├── project.enum.ts                (mo rong)
  │     ├── ncr.enum.ts                         (moi)
  │     └── ... (existing)
  ├── project-ncr.service.ts                    (moi)
  ├── work-item.service.ts                      (moi)
  ├── subcontractor-kpi.service.ts              (moi)
  └── ... (existing)

src/shared/
  └── services/
        └── cloud-storage.service.ts            (moi)
```

---

## 11. CHECKLIST SA

- [x] Entity va quan he Database (ERD) da xac dinh
- [x] API Endpoints da liet ke (15+ endpoints moi)
- [x] Interface va DTOs da dinh nghia (10+ DTOs moi)
- [x] Clean Architecture folder structure ro rang
- [x] Status state machine ro rang (11 trang thai + transitions)
- [x] Tich hop voi Approvals module da thiet ke
- [x] Cloud storage strategy da chon (Cloudinary)
- [x] Migration plan da lap (4 migrations)
- [x] Frontend impact da danh gia
- [x] Toi uu cho truy van: indexes tren project_id, status, category

---

## 12. THU TU IMPLEMENT (De xuat)

| Buoc | Noi dung | Estimate |
|------|----------|----------|
| 1 | Migration: Mo rong Project entity + status enum | Nho |
| 2 | Cap nhat status transitions + DTOs | Nho |
| 3 | NCR entities + service + controller + endpoints | Trung binh |
| 4 | Cloud storage service (Cloudinary) | Nho |
| 5 | NCR attachment upload | Nho |
| 6 | WorkItemMaster entity + CRUD | Nho |
| 7 | SubcontractorKpi entity + CRUD | Nho |
| 8 | Frontend: Project status expansion | Trung binh |
| 9 | Frontend: NCR management page | Lon |
| 10 | Frontend: Work Item + Supplier KPI | Trung binh |
