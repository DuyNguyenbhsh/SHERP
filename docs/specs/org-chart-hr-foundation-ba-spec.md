# BA_SPEC: Org Chart & HR Foundation — Mô hình tổ chức Xây dựng

> **Feature:** Org Chart linh hoạt cho doanh nghiệp Xây dựng (Central Cons / IMPC)
> **Chuẩn tham chiếu:** Quy trình Thanh toán NTP (8 Swimlanes) + Oracle Fusion HCM
> **Ngày tạo:** 2026-03-26
> **Trạng thái:** GATE 1 — BA ANALYSIS

---

## 1. Phân tích 8 Swimlanes — Quy trình Thanh toán NTP

Trong doanh nghiệp xây dựng Central Cons / IMPC, quy trình thanh toán Nhà Thầu Phụ (NTP) đi qua **8 làn bơi**, chia rõ **Central (trụ sở)** vs **Site (công trình)**:

### 6 Swimlanes & Phân loại (Theo tài liệu Quy trình QLDА Central Cons — Trang 52/60)

| # | Swimlane | Scope | Loại | Vai trò chính | SLA |
|---|----------|-------|------|--------------|-----|
| 1 | **GSHT (Giám sát Hiện trường)** | Site | SITE | Điều chỉnh KL trong ngân sách, ghi nhận KL xây dựng theo tiến độ từng công việc trong phạm vi hợp đồng | Liên tục |
| 2 | **QS Công trình** | Site | SITE | Kiểm tra + xác nhận KL đã thực hiện, Phiếu nhập kho, Biên bản hiện trường, Phiếu xuất kho, Lập chứng từ phải thu, **Lập HSTT** | Trước ngày 7 hàng tháng |
| 3 | **CHT (Chỉ huy trưởng)** | Site | SITE | Duyệt HSTT trên hệ thống, chuyển C&C | **Trước ngày 7 hàng tháng** |
| 4 | **GĐDA (Giám đốc Dự án)** | Central | CENTRAL | Duyệt HSTT + Thông báo NTP xuất hoá đơn | **Trong 2 ngày** kể từ nhận HSTT |
| 5 | **C&C (Chuyên viên + Trưởng phòng)** | Central | CENTRAL | Chuyên viên kiểm tra tính hợp lý HSTT, Trưởng phòng kiểm tra + xác nhận | **Trong 4 ngày** kể từ nhận HSTT |
| 6 | **QS (Nhận phản hồi)** | Site | SITE | Nhận thông tin duyệt GĐDA từ hệ thống → Thông báo NTP xuất hoá đơn | Ngay khi nhận |

### Luồng thanh toán NTP (Chính xác theo tài liệu PROJ.10)

```
GSHT ──→ QS Công trình ──→ CHT ──→ GĐDA ──→ C&C ──→ QS thông báo NTP
  │           │               │        │        │          │
  ▼           ▼               ▼        ▼        ▼          ▼
Ghi nhận   - Xác nhận KL    Duyệt   Duyệt   CV: Kiểm    Nhận duyệt
KL xây     - Phiếu NK/XK    HSTT    + Thông   tra HSTT    từ hệ thống
dựng theo  - BB hiện trường  trên    báo NTP  TP: Xác     → Thông báo
tiến độ    - Chứng từ thu    hệ      xuất     nhận        NTP xuất
từng CV    - Lập HSTT        thống   hoá đơn               hoá đơn

[SITE]     [SITE]           [SITE]  [CENTRAL] [CENTRAL]   [SITE]
           Deadline: 7/tháng         SLA: 2d   SLA: 4d
```

### Nghiệp vụ chi tiết QS Công trình (Swimlane 2)

QS thực hiện **6 công việc** trước khi trình CHT:
1. **Kiểm tra, xác nhận khối lượng** đã thực hiện tại công trình
2. **Phiếu nhập kho** mua hàng (vật tư nhập site)
3. **Biên bản hiện trường** / Thông tin phiếu xuất kho
4. **Lập chứng từ phải thu** (đối soát NTP)
5. **Lập Hồ sơ Thanh toán (HSTT)** — output chính của QS
6. Trình CHT duyệt **trước ngày 7 hàng tháng**

### Nghiệp vụ C&C (Swimlane 5 — 2 cấp duyệt)

| Cấp | Vai trò | Công việc |
|-----|---------|-----------|
| 1 | Chuyên viên C&C | Kiểm tra tính hợp lý HSTT trên hệ thống |
| 2 | Trưởng phòng C&C | Kiểm tra + Xác nhận chính thức |

**SLA chung:** Trong vòng 4 ngày kể từ khi nhận được HSTT.

---

## 2. Position Types (Danh sách Vị trí)

### 2.1 SITE Positions — Trực tiếp tham gia luồng NTP

| Position Code | Position Name | Scope | Swimlane # | Mô tả |
|--------------|---------------|-------|:----------:|--------|
| `SITE_SUPERVISOR` | Giám sát Hiện trường (GSHT) | 1 Site | **1** | Ghi nhận KL xây dựng theo tiến độ từng CV, điều chỉnh KL trong ngân sách |
| `SITE_QS` | QS Công trình | 1 Site | **2** | Xác nhận KL, phiếu NK/XK, BB hiện trường, chứng từ phải thu, **lập HSTT** |
| `SITE_DIRECTOR` | Chỉ huy trưởng (CHT) | 1 Site | **3** | Duyệt HSTT trên hệ thống trước ngày 7 hàng tháng |
| `SITE_ACCOUNTANT` | Kế toán Công trình | 1 Site | — | Hỗ trợ chứng từ, hạch toán chi phí site |
| `SITE_ENGINEER` | Kỹ sư Công trình | 1 Site | — | Giám sát thi công, báo cáo tiến độ |
| `SITE_SAFETY` | An toàn Lao động | 1 Site | — | Giám sát ATLĐ |

### 2.2 CENTRAL Positions — Trụ sở / Portfolio

| Position Code | Position Name | Scope | Swimlane # | Mô tả |
|--------------|---------------|-------|:----------:|--------|
| `PROJECT_DIRECTOR` | Giám đốc Dự án (GĐDA) | Portfolio | **4** | Duyệt HSTT + Thông báo NTP xuất hoá đơn (SLA: 2 ngày) |
| `CC_SPECIALIST` | Chuyên viên C&C | Portfolio | **5** | Kiểm tra tính hợp lý HSTT trên hệ thống |
| `CC_MANAGER` | Trưởng phòng C&C | Portfolio | **5** | Kiểm tra + Xác nhận HSTT chính thức (SLA: 4 ngày) |
| `CHIEF_ACCOUNTANT` | Kế toán trưởng (KTT) | Portfolio | — | Kiểm soát tài chính, phê duyệt lệnh chi |
| `PMO_MANAGER` | Trưởng phòng PMO | Portfolio | — | Quản lý danh mục dự án, phân bổ nguồn lực |
| `HR_MANAGER` | Trưởng phòng Nhân sự | Portfolio | — | Quản lý nhân sự, điều phối |
| `PROCUREMENT_MANAGER` | Trưởng phòng Mua hàng | Portfolio | — | Quản lý NTP, hợp đồng mua sắm |

### 2.3 Luồng phản hồi đặc biệt (Swimlane 6)
Sau khi GĐDA duyệt → Hệ thống tự động thông báo cho **QS Công trình** → QS thông báo NTP xuất hoá đơn.
Đây là vòng lặp feedback, không phải vai trò riêng.

### 2.3 Phân biệt Scope

| Thuộc tính | SITE (Công trình) | CENTRAL (Trụ sở) |
|-----------|-------------------|-------------------|
| **Dữ liệu thấy** | Chỉ dự án mình quản lý | Toàn bộ Portfolio |
| **Quyền phê duyệt** | Cấp công trình | Cấp công ty |
| **Gán vào** | 1 hoặc nhiều Project cụ thể | Department (không gán project) |
| **Ví dụ** | PM@Vincom-Q7 chỉ thấy dự án Vincom Q7 | PD thấy tất cả dự án |

---

## 3. Business Rules

### BR-01: Org Unit phải phân loại rõ ràng
- Mỗi Org Unit có `type`: `DEPARTMENT` (Central) hoặc `PROJECT_SITE` (Site)
- Department thuộc cây tổ chức công ty (HR, Finance, PMO, ...)
- Project Site là node tạm thời, tạo khi có dự án, đóng khi dự án hoàn thành

### BR-02: Mỗi Employee có 1 Position trong 1 Org Unit
- Position xác định **chức danh** (CHT, QS, PM, ...)
- Org Unit xác định **nơi làm việc** (Phòng PMO, Công trình Vincom Q7)
- Kết hợp Position + Org Unit → xác định Scope dữ liệu

### BR-03: Project Assignment mở rộng
- 1 Employee có thể assigned vào nhiều Project (ví dụ QS làm 2 công trình)
- Mỗi Assignment có `role` cụ thể tại project đó
- Assignment Role phải map với Position Type (CHT chỉ gán role `SITE_DIRECTOR`)

### BR-04: Data Scope — Sau Login
```
IF User.position.scope = 'SITE'
   → Chỉ xem dữ liệu Project mà User được assigned

IF User.position.scope = 'CENTRAL'
   → Xem toàn bộ Portfolio (tất cả Projects)

IF User.position.scope = 'CENTRAL' AND position = 'CFO'
   → Xem toàn bộ + Quyền phê duyệt tài chính
```

### BR-05: Position → Role Mapping
- Position `SITE_PM` → tự động gán Role `PROJECT_MANAGER` (RBAC hôm trước)
- Position `PROJECT_DIRECTOR` → tự động gán Role `PROJECT_DIRECTOR`
- Position `SITE_ACCOUNTANT` hoặc `CENTRAL_ACCOUNTANT` → Role `PROJECT_ACCOUNTANT`
- Mapping này đảm bảo Privileges nhất quán với thiết kế RBAC 3 vai trò

---

## 4. Gap Analysis — Hiện trạng vs Yêu cầu

| Thành phần | Hiện trạng | Cần làm |
|-----------|-----------|---------|
| Org Unit type | Chỉ có `CORPORATE_DEPT`, `RETAIL_STORE` | Thêm `PROJECT_SITE`, `DIVISION` |
| Position entity | ❌ Không có (job_title = free text) | Tạo bảng `positions` |
| Employee → Position | ❌ Không có | Thêm FK `position_id` trên Employee |
| Position scope | ❌ Không có | Thêm `scope` (SITE/CENTRAL) trên Position |
| Project Assignment role | Chỉ có `PROJECT_MANAGER`, `MEMBER` | Mở rộng thêm CHT, QS, ACCOUNTANT, ENGINEER |
| Data scope filter | ❌ Không có | Logic filter dữ liệu theo position scope |
| Login → scope | ❌ Không có | Query position + assignments sau login |

---

## 5. BA Checklist

- [x] 8 Swimlanes phân tích (4 Site + 4 Central)
- [x] 13 Position Types định nghĩa (6 Site + 7 Central)
- [x] Scope dữ liệu: SITE (per-project) vs CENTRAL (portfolio)
- [x] Business Rules (5 rules)
- [x] Gap Analysis vs code hiện tại
- [x] Position → Role mapping với RBAC design hôm trước

> **BA Sign-off:** Sẵn sàng chuyển GATE 2 — SA Design.
