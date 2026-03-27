# PROJ.10 — Quy trình Ghi nhận Thanh toán NCC/NTP

> **Nguồn:** ERP_CENTRAL Quy Trình Quản lý Dự Án V1 (03/05/2021) — Trang 48-52
> **File gốc:** `.claude/docs/docs/ERP_CENTRAL Quy Trinh Quan ly Du An V1_ 20210503.pdf`
> **Hệ thống:** Greensys ERP → Áp dụng cho SH ERP
> **Mã quy trình:** QTNV-PROJ / PROJ.10

---

## 1. Mục đích & Phạm vi

**Mục đích:** Mô tả các bước ghi nhận thanh toán với NCC/NTP trên hệ thống.

**Phạm vi áp dụng:**
- Đối tượng: Các hoạt động nghiệm thu giữa Central và Nhà thầu phụ
- Trách nhiệm: Ban chỉ huy công trình + Các Phòng/Ban/Bộ phận liên quan

**Điều kiện thực hiện:**
- Đã có Hợp đồng thầu phụ (từ PUR.1.3)
- NTP trình khối lượng xây dựng thực tế dựa trên hợp đồng

---

## 2. Các Swimlanes (7 vai trò)

| # | Vai trò | Scope | Mã bước |
|---|---------|:-----:|---------|
| 1 | Nhà thầu phụ (NTP) | External | PROJ.10.1 |
| 2 | Giám sát Hiện trường (GSHT) | SITE | PROJ.10.2, PROJ.10.3 |
| 3 | QS Công trình | SITE | PROJ.10.4 → PROJ.10.8, PROJ.10.13 |
| 4 | Chỉ huy trưởng (CHT) | SITE | PROJ.10.9 |
| 5 | Giám đốc Dự án (GĐDA) | CENTRAL | PROJ.10.10 |
| 6 | Chuyên viên C&C + Trưởng phòng C&C | CENTRAL | PROJ.10.11, PROJ.10.12 |
| 7 | Kế toán Công trình | SITE | PROJ.10.15 |

---

## 3. Chi tiết từng bước

### PROJ.10.1 — NTP trình khối lượng
- **Thực hiện:** Nhà thầu phụ (ngoài hệ thống)
- **Hành động:** Trình khối lượng xây dựng thực tế đến Central theo thời gian quy định

### PROJ.10.2 — QS/GSHT điều chỉnh khối lượng trong ngân sách
- **Thực hiện:** Giám sát Hiện trường + QS (trên ERP)
- **Hành động:** GSHT kiểm tra KL thực tế của NTP bao gồm:
  - Khấu trừ bảo hộ lao động
  - Phạt an toàn
  - Khấu trừ vật tư thiết bị đã cấp phục vụ thi công
  - Phạt vi phạm quản lý thiết bị

#### ⚡ Decision Point 1: Trong phạm vi hợp đồng?
```
IF khối lượng TRONG phạm vi hợp đồng
   → Chuyển PROJ.10.3

IF khối lượng NGOÀI hợp đồng
   → Decision Point 2: Vượt ngân sách?
      IF vượt ngân sách
         → Chuyển BUD.2 (Điều chỉnh ngân sách)
      IF không vượt
         → Decision Point 3: Giao thêm khối lượng?
            IF giao thêm
               → QS điều chỉnh KL trong ngân sách (PROJ.10.2)
               → Quy tắc PLHĐ:
                  • HĐ trên 1 tỷ: PLHĐ 5%
                  • HĐ dưới 1 tỷ: PLHĐ 10%
            IF không giao thêm
               → Chuyển PROJ.10.3
```

### PROJ.10.3 — GSHT ghi nhận khối lượng đạt yêu cầu
- **Thực hiện:** Giám sát Hiện trường (trên ERP)
- **Hành động:** Ghi nhận KL xây dựng đạt yêu cầu theo **từng công việc**, **từng vị trí**, đính kèm hình ảnh lên hệ thống
- **Biểu mẫu:** Biên bản và mặt bằng nghiệm thu nội bộ

### PROJ.10.4 — QS kiểm tra, tổng hợp khối lượng
- **Thực hiện:** QS Công trình (trên ERP)
- **Hành động:** Kiểm tra thông tin KL từ GSHT. Căn cứ hồ sơ: bảng vẽ mặt bằng, bảng tính chi tiết, các hồ sơ liên quan → Tổng hợp KL đã thực hiện → Lập hồ sơ thanh toán

### PROJ.10.5 — QS lập phiếu nhập kho mua hàng
- **Thực hiện:** QS Công trình (trên ERP)
- **Hành động:** Lập phiếu nhập kho mua hàng trên hệ thống

### PROJ.10.6 — Biên bản hiện trường / Phiếu xuất kho
- **Thực hiện:** QS Công trình (trên ERP)
- **Hành động:** Dựa vào thông tin phiếu xuất kho, biên bản hiện trường

### PROJ.10.7 — QS lập chứng từ phải thu
- **Thực hiện:** QS Công trình (trên ERP)
- **Hành động:** Lập chứng từ phải thu trên hệ thống

### PROJ.10.8 — QS lập hồ sơ thanh toán (HSTT)
- **Thực hiện:** QS Công trình (trên ERP)
- **Input:** PROJ.10.4 + PROJ.10.5 + PROJ.10.6 + PROJ.10.7
- **Hành động:** Lập HSTT trên hệ thống
- **⏰ SLA:** Gửi đến CHT **trước ngày 5 hàng tháng**

### PROJ.10.9 — CHT duyệt HSTT
- **Thực hiện:** Chỉ huy trưởng (trên ERP)
- **⏰ SLA:** Duyệt trên hệ thống **trước ngày 7 hàng tháng**
- **Output:** Chuyển Chuyên viên C&C

#### ⚡ Decision Point 4: CHT Duyệt?
```
IF CHT duyệt (Y)
   → Chuyển PROJ.10.11 (C&C kiểm tra)
   → Đồng thời chuyển PROJ.10.10 (GĐDA duyệt)

IF CHT từ chối (N)
   → Trả về QS Công trình sửa HSTT
```

### PROJ.10.10 — GĐDA duyệt + Thông báo NTP xuất hoá đơn
- **Thực hiện:** Giám đốc Dự án (trên ERP)
- **⏰ SLA:** Trong vòng **2 ngày** kể từ khi nhận HSTT
- **Hành động:** Duyệt HSTT + Thông báo cho NTP xuất hoá đơn

#### ⚡ Decision Point 5: GĐDA Duyệt?
```
IF GĐDA duyệt (Y)
   → Hệ thống thông báo QS (PROJ.10.13)
   → QS thông báo NTP xuất hoá đơn

IF GĐDA từ chối (N)
   → Trả về QS Công trình
```

### PROJ.10.11 — Chuyên viên C&C kiểm tra
- **Thực hiện:** Chuyên viên C&C (trên ERP)
- **Hành động:** Kiểm tra tính hợp lý HSTT trên hệ thống

### PROJ.10.12 — Trưởng phòng C&C kiểm tra + xác nhận
- **Thực hiện:** Trưởng phòng C&C (trên ERP)
- **⏰ SLA:** Trong vòng **4 ngày** kể từ khi nhận HSTT
- **Hành động:** Kiểm tra và xác nhận chính thức

### PROJ.10.13 — QS thông báo NTP xuất hoá đơn
- **Thực hiện:** QS Công trình (feedback từ hệ thống)
- **Trigger:** Nhận được thông tin duyệt của GĐDA từ hệ thống
- **Hành động:** Thông báo NTP xuất hoá đơn

### PROJ.10.14 — NTP xuất hoá đơn
- **Thực hiện:** Nhà thầu phụ (ngoài hệ thống)
- **Hành động:** Xuất hoá đơn GTGT
- **Kết nối:** Chuyển FIN.1 (Quản lý hoá đơn phải trả)

### PROJ.10.15 — Kế toán công trình in đề nghị thanh toán
- **Thực hiện:** Kế toán Công trình (trên ERP)
- **Hành động:** In đề nghị thanh toán

---

## 4. Quy tắc Phụ lục Hợp đồng (PLHĐ)

| Giá trị Hợp đồng | % PLHĐ |
|-------------------|--------|
| Trên 1 tỷ VNĐ | 5% |
| Dưới 1 tỷ VNĐ | 10% |

---

## 5. SLA Summary

| Bước | Người thực hiện | Deadline |
|------|----------------|----------|
| PROJ.10.8 | QS Công trình → CHT | **Trước ngày 5 hàng tháng** |
| PROJ.10.9 | CHT duyệt + chuyển C&C | **Trước ngày 7 hàng tháng** |
| PROJ.10.10 | GĐDA duyệt | **Trong 2 ngày** kể từ nhận HSTT |
| PROJ.10.11-12 | C&C (CV + TP) kiểm tra + xác nhận | **Trong 4 ngày** kể từ nhận HSTT |

---

## 6. Quy tắc Thanh toán

- **NTP:** Thời hạn thanh toán tính từ ngày **GĐDA duyệt HSTT**
- **NCC:** Thời hạn thanh toán tính từ ngày **NCC xuất hoá đơn**
- Thanh toán theo điều khoản thanh toán của hợp đồng

---

## 7. Tổng hợp Decision Points

| # | Vị trí | Điều kiện | Nhánh Y | Nhánh N |
|---|--------|-----------|---------|---------|
| DP1 | GSHT/QS | Trong phạm vi HĐ? | → PROJ.10.3 | → DP2 (vượt NS?) |
| DP2 | GSHT/QS | Vượt ngân sách? | → BUD.2 (điều chỉnh NS) | → DP3 |
| DP3 | GSHT/QS | Giao thêm KL? | → PROJ.10.2 + PLHĐ (5%/10%) | → PROJ.10.3 |
| DP4 | CHT | Duyệt HSTT? | → C&C + GĐDA | → Trả QS sửa |
| DP5 | GĐDA | Duyệt? | → QS thông báo NTP xuất HĐ | → Trả QS |

---

## 8. Quy trình liên quan

| Mã | Tên | Mối liên hệ |
|----|-----|-------------|
| **PUR.1.3** | Quản lý hợp đồng lập tại công trình | Input — HĐ thầu phụ phải tồn tại trước |
| **BUD.2** | Điều chỉnh ngân sách | Gọi khi KL ngoài HĐ vượt ngân sách |
| **FIN.1** | Quản lý hoá đơn phải trả | Output — sau khi NTP xuất HĐ |

---

> **Lưu ý cho Developer:** Mọi approval workflow trong SH ERP phải đối chiếu với file này.
> Đặc biệt: thứ tự swimlanes, SLA deadlines, và 5 decision points.
