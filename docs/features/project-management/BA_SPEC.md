# BA_SPEC: Module Quan ly Du an (Project Management)

> **Nguon tai lieu:** ERP_CENTRAL Quy Trinh Quan ly Du An V1_20210503 (60 trang)
> **Ngay phan tich:** 2026-04-06
> **Trang thai:** Gate 1 — BA Analysis

---

## 1. TONG QUAN NGHIEP VU

Module Quan ly Du an (PROJ) bao gom **13 quy trinh con** theo tai lieu Greensys ERP cua Central:

| Ma | Quy trinh | Uu tien SHERP | Ly do |
|----|-----------|---------------|-------|
| PROJ.1 | Quan ly thong tin dau thau (Xay lap) | **P1** | Core: tao du an tu dau thau |
| PROJ.2 | Quan ly thong tin dau thau Design & Build | **P1** | Tuong tu PROJ.1, them thiet ke |
| PROJ.3 | Khai bao cong tac moi | **P1** | Master data cho BOQ/WBS |
| PROJ.4 | Khai bao thong tin du an sau trung thau | **P1** | Core: khoi tao du an chinh thuc |
| PROJ.5 | Quan ly NCC/NTP | P2 | Da co module Suppliers, can mo rong KPI |
| PROJ.6 | Ke hoach ky ket hop dong NCC/NTP | P2 | Phu thuoc Procurement |
| PROJ.7 | Quan ly don gia mua thau phu | P2 | Phu thuoc PROJ.5 |
| PROJ.8 | Quan ly su khong phu hop (NCR) | **P1** | Quan trong: chat luong du an |
| PROJ.9 | Quan ly tam ung NCC/NTP | P3 | Thuoc Finance (chua co) |
| PROJ.10 | Ghi nhan thanh toan NCC/NTP | P3 | Thuoc Finance (chua co) |
| PROJ.12 | Quan ly phi truc tiep BCH | P3 | Thuoc Finance (chua co) |
| PROJ.13 | Quan ly bao hanh, bao tri | P2 | Giai doan sau |

---

## 2. USER STORIES — PRIORITY 1

### US-PROJ-01: Quan ly thong tin dau thau

**Mo ta:** Nguoi dung (Phong Dau thau) co the tao va quan ly ho so dau thau tu luc nhan yeu cau khach hang den khi co ket qua trung/truot thau.

**Acceptance Criteria:**
- Tao du an voi trang thai `BIDDING` (Dang du thau)
- Lien ket voi Khach hang (Investor/CĐT) — FK toi `suppliers`
- Khai bao thong tin chung: ten du an, dia diem, loai du an (Xay lap / D&B / MEP), GFA
- Danh gia rui ro CĐT/Du an (truong `risk_assessment`)
- Kickoff meeting → phan cong nhan su du thau
- Dinh kem ho so dau thau (files)
- Nop thau → Doi ket qua
- Trung thau → Chuyen trang thai `WON_BID`, ghi nhan ngay trung thau
- Truot thau → Chuyen trang thai `LOST_BID`, ghi ly do

**Business Rules:**
- BR-01: Du an PHAI co CĐT (investor_id) truoc khi nop thau
- BR-02: Chuyen trang thai `WON_BID` can duyet CEO (approval flow)
- BR-03: Moi du an dau thau phai co danh gia rui ro truoc khi duyet tham gia

### US-PROJ-02: Khai bao thong tin du an sau trung thau (PROJ.4)

**Mo ta:** Sau khi trung thau, GĐDA cap nhat thong tin du an, nap BOQ/cong viec, va lien ket thanh vien du an.

**Acceptance Criteria:**
- Cap nhat thong tin hop dong CĐT: so hop dong, gia tri hop dong, ngay ky
- Nap BOQ tu Excel vao he thong (da co `project-boq-import`)
- Ghi nhan cong viec theo hop dong CĐT (WBS items)
- Lap danh sach thanh vien thuc hien du an (assignments) voi vai tro
- Chuyen trang thai du an sang `ACTIVE` (Dang thuc hien thi cong)

**Business Rules:**
- BR-04: Khong duoc chuyen sang ACTIVE neu chua co hop dong CĐT
- BR-05: Du an ACTIVE phai co it nhat 1 thanh vien duoc phan cong (assignment)
- BR-06: BOQ import phai validate: khong trung ma cong viec, tong gia tri khop voi hop dong

### US-PROJ-03: Khai bao cong tac moi (PROJ.3)

**Mo ta:** Ban ERP khai bao cac cong tac (Work Items) moi chua co trong he thong, bao gom tieu chuan ky thuat va dinh muc.

**Acceptance Criteria:**
- Khai bao cong tac voi: ma, ten, don vi tinh, nhom cong tac
- Dinh nghia checklist kiem tra (ITP - Inspection Testing Plan)
- Khai bao tieu chuan ky thuat (specifications)
- Dinh kem hinh anh chuan cua tung cong viec
- Lien ket voi WBS cua du an

**Business Rules:**
- BR-07: Ma cong tac phai duy nhat trong toan he thong
- BR-08: Cong tac moi phai co it nhat 1 tieu chuan ky thuat

### US-PROJ-04: Quan ly su khong phu hop — NCR (PROJ.8)

**Mo ta:** Khi phat hien su khong phu hop tai cong trinh, nguoi dung ghi nhan NCR, phan cong xu ly, theo doi va dong NCR.

**Acceptance Criteria:**
- Ghi nhan NCR voi phan loai: Chat luong / Tien do / An toan
- 5 cap do muc do: Xanh / Vang / Cam / Do / Do tham
- Lien ket NCR voi: Du an, Cong viec, Hang muc, Hop dong thau phu, Cong ty
- Phan cong nguoi xu ly (CHT chi dinh)
- Dinh kem hinh anh truoc/sau xu ly
- Ghi nhan tien phat NCC/NTP (neu co)
- Kiem tra chap nhan (P.QLKTTC duyet)
- Bo co su khong phu hop khi da xu ly xong
- Bao cao NCR: thong ke theo du an, loai, muc do

**Business Rules:**
- BR-09: NCR PHAI co hinh anh dinh kem
- BR-10: NCR muc do Do/Do tham phai thong bao GĐDA ngay lap tuc
- BR-11: Tien phat NCC/NTP tu NCR phai lien ket voi hop dong thau phu (PROJ.10)

---

## 3. USER STORIES — PRIORITY 2

### US-PROJ-05: Quan ly NCC/NTP (PROJ.5)

- Khai bao NCC/NTP moi (mo rong module Suppliers hien co)
- Cap nhat chi tieu KPI danh gia NCC/NTP
- Danh gia dinh ky 6 thang
- Danh sach NCC/NTP khong dat → trinh BTGĐ duyet
- Ghi nhan khong tiep tuc ky moi → khoa NCC/NTP

### US-PROJ-06: Ke hoach ky ket hop dong (PROJ.6)

- BCH CT lap ke hoach ky ket hop dong NCC/NTP
- Phe duyet nhieu cap: CHT → GĐDA → GĐĐH → TGĐ
- Lien ket voi ngan sach du an (BUD.2)

### US-PROJ-07: Quan ly don gia thau phu (PROJ.7)

- Nhap bang gia NTP vao he thong
- He thong chi cho phep 1 bang gia co hieu luc tai 1 thoi diem
- So sanh gia: gia NTP vs gia ngan sach vs gia quy che vs lich su gia
- TP. C&C duyet bang gia

### US-PROJ-08: Quan ly bao hanh, bao tri (PROJ.13)

- Ghi nhan thong tin bao hanh theo hop dong
- Theo doi cac su co phat sinh trong thoi gian bao hanh
- Phan cong xu ly va nghiem thu

---

## 4. TRANG THAI DU AN (Project Status Flow)

Theo tai lieu Central, du an co cac trang thai:

```
BIDDING (Dang du thau)
  ├── WON_BID (Trung thau, chua ky HD)
  │     └── ACTIVE (Dang thuc hien thi cong)
  │           ├── ON_HOLD (Tam dung)
  │           ├── SETTLING (Dang quyet toan)
  │           │     └── SETTLED (Da quyet toan)
  │           │           └── WARRANTY (Bao hanh)
  │           │                 └── RETENTION_RELEASED (Da giai toa bao luu — Dong DA)
  │           └── CANCELED (Huy)
  └── LOST_BID (Truot thau)
```

**So sanh voi entity hien tai:**

| Hien tai (ProjectStatus) | Can bo sung |
|---------------------------|-------------|
| DRAFT | Giu lai, dung cho draft chua nop thau |
| ACTIVE | Giu |
| ON_HOLD | Giu |
| COMPLETED | Thay bang flow chi tiet: SETTLED → WARRANTY → RETENTION_RELEASED |
| CANCELED | Giu |
| *(thieu)* | BIDDING, WON_BID, LOST_BID, SETTLING, SETTLED, WARRANTY, RETENTION_RELEASED |

---

## 5. DU LIEU CAN THIET (Fields Analysis)

### 5.1 Mo rong Entity `Project`

| Field | Type | Mo ta | Nguon |
|-------|------|-------|-------|
| `project_type` | enum | XAY_LAP / DESIGN_BUILD / MEP | PROJ.1, PROJ.2 |
| `bid_date` | date | Ngay nop thau | PROJ.1.22 |
| `bid_result_date` | date | Ngay co ket qua thau | PROJ.1.23 |
| `lost_bid_reason` | text | Ly do truot thau | PROJ.1.24 |
| `contract_number` | varchar | So hop dong CĐT | PROJ.4.1 |
| `contract_value` | decimal | Gia tri hop dong CĐT | PROJ.4.1 |
| `contract_date` | date | Ngay ky hop dong | PROJ.4.1 |
| `risk_assessment` | text/json | Danh gia rui ro du an | PROJ.1.2 |
| `warranty_start` | date | Ngay bat dau bao hanh | PROJ.13 |
| `warranty_end` | date | Ngay ket thuc bao hanh | PROJ.13 |
| `retention_rate` | decimal | Ty le bao luu (%) | PROJ.13 |

### 5.2 Entity moi: `NonConformanceReport` (NCR)

| Field | Type | Mo ta |
|-------|------|-------|
| `id` | uuid | PK |
| `ncr_code` | varchar | Ma NCR (tu dong: NCR-YYMMDD-XXX) |
| `project_id` | FK → projects | Du an lien quan |
| `category` | enum | QUALITY / SCHEDULE / SAFETY |
| `severity` | enum | GREEN / YELLOW / ORANGE / RED / CRITICAL |
| `description` | text | Mo ta su khong phu hop |
| `related_type` | enum | TASK / WORK_ITEM / SUBCONTRACT / PROJECT / COMPANY |
| `related_id` | varchar | ID doi tuong lien quan |
| `assigned_to` | FK → employees | Nguoi xu ly |
| `assigned_by` | FK → employees | Nguoi phan cong (CHT) |
| `penalty_amount` | decimal | Tien phat (neu co) |
| `subcontract_id` | FK | Hop dong thau phu lien quan |
| `status` | enum | OPEN / IN_PROGRESS / RESOLVED / VERIFIED / CLOSED |
| `images_before` | json | Hinh anh truoc xu ly |
| `images_after` | json | Hinh anh sau xu ly |
| `resolution_note` | text | Ghi chu xu ly |
| `verified_by` | FK → employees | Nguoi kiem tra chap nhan |
| `verified_at` | timestamp | Thoi diem kiem tra |

### 5.3 Entity moi: `WorkItem` (Cong tac)

| Field | Type | Mo ta |
|-------|------|-------|
| `id` | uuid | PK |
| `item_code` | varchar | Ma cong tac (unique) |
| `item_name` | varchar | Ten cong tac |
| `unit` | varchar | Don vi tinh |
| `group` | varchar | Nhom cong tac |
| `specifications` | text/json | Tieu chuan ky thuat |
| `inspection_checklist` | json | Checklist kiem tra (ITP) |
| `reference_images` | json | Hinh anh chuan |
| `is_active` | boolean | Trang thai hoat dong |

### 5.4 Entity moi: `SubcontractorKpi`

| Field | Type | Mo ta |
|-------|------|-------|
| `id` | uuid | PK |
| `supplier_id` | FK → suppliers | NCC/NTP |
| `project_id` | FK → projects | Du an (nullable) |
| `evaluation_date` | date | Ngay danh gia |
| `criteria` | json | Cac chi tieu KPI |
| `score` | decimal | Diem tong |
| `result` | enum | PASS / FAIL |
| `approved_by` | FK → employees | Nguoi duyet |
| `notes` | text | Ghi chu |

---

## 6. KPIs & BAO CAO

| KPI | Cong thuc | Nguon du lieu |
|-----|-----------|---------------|
| Ty le trung thau | Won / (Won + Lost) x 100% | projects.status |
| So NCR theo du an | COUNT(ncr WHERE project_id) | non_conformance_reports |
| Thoi gian xu ly NCR | AVG(resolved_at - created_at) | non_conformance_reports |
| Diem KPI NCC/NTP | AVG(score) GROUP BY supplier_id | subcontractor_kpis |
| Gia tri hop dong / Ngan sach | contract_value / budget | projects |
| Tien phat NCR | SUM(penalty_amount) GROUP BY project_id | non_conformance_reports |

---

## 7. ANH HUONG DEN FINANCIALS

| Nghiep vu | Anh huong tai chinh | Module lien quan |
|-----------|---------------------|------------------|
| Trung thau → Ky hop dong | Ghi nhan gia tri hop dong (Revenue pipeline) | Finance (planned) |
| Tam ung NCC/NTP | No Cong no phai tra | Finance (planned) |
| Thanh toan NCC/NTP | No TK Chi phi / Co TK Cong no | Finance (planned) |
| Phat NCR | Giam cong no NCC/NTP | Finance (planned) |
| Bao luu | Giu lai % gia tri hop dong | Finance (planned) |

> **Luu y:** PROJ.9, PROJ.10, PROJ.12 (Tam ung, Thanh toan, Chi phi truc tiep) se duoc implement khi module Finance san sang. Hien tai chi luu metadata tham chieu.

---

## 8. CHECKLIST BA

- [x] User Stories da liet ke day du (8 US cho 13 quy trinh)
- [x] Business Rules ro rang (BR-01 → BR-11)
- [x] KPI fields duoc xac dinh (6 KPIs)
- [x] Anh huong den Financials da duoc danh gia
- [x] Trang thai du an da mapping voi tai lieu Central
- [x] Uu tien hoa (P1/P2/P3) de phu hop voi hien trang he thong

---

## 9. QUYET DINH THIET KE CAN XAC NHAN VOI DUY

1. **ProjectStatus enum:** Mo rong tu 5 → 11 trang thai (BIDDING, WON_BID, LOST_BID, SETTLING, SETTLED, WARRANTY, RETENTION_RELEASED). Co anh huong nhieu code frontend — can xac nhan.

2. **NCR module:** Tach thanh module rieng `ncr/` hay de trong `projects/`?

3. **WorkItem entity:** Da co `project-boq-item` — WorkItem la master data dung chung, con BOQ Item la instance cua WorkItem trong 1 du an cu the. Dung huong nay?

4. **File upload:** NCR can upload hinh anh. Su dung cloud storage (S3/Cloudinary) hay luu local?

5. **Approval flow:** PROJ.6, PROJ.9 can phe duyet nhieu cap (CHT → GĐDA → GĐĐH → TGĐ). Dung module `approvals/` da co?
