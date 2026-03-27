# Tổng hợp Quy trình Quản lý Dự án — Central Cons (Greensys ERP)

> **Nguồn:** ERP_CENTRAL Quy Trình Quản lý Dự Án V1 (03/05/2021) — 60 trang
> **File gốc:** `docs/reference/docs/ERP_CENTRAL Quy Trinh Quan ly Du An V1_ 20210503.pdf`
> **Số kiểm soát:** QTNV-PROJ | Phiên bản: 1.0
> **Người duyệt:** Nguyễn Văn An (GĐDA ERP Central), Nguyễn Cát Minh (GĐDA ERP Greensys)

---

## Tổng quan — 12 Quy trình

```
PROJ. QUY TRÌNH QUẢN LÝ DỰ ÁN TỔNG QUAN

Đấu thầu: PROJ.1 → PROJ.2 → PROJ.4 → PROJ.3
Quản lý NTP: PROJ.5 → PROJ.6 → PROJ.7
Vận hành: PROJ.8 (NCR) → PROJ.9 (Tạm ứng) → PROJ.10 (Thanh toán)
Chi phí: PROJ.12 (Chi trực tiếp) → BUD.2 (Ngân sách)
Bảo hành: PROJ.13
```

---

## PROJ.1 — Quản lý Thông tin Đấu thầu (Trang 9-16)

### Mục đích
Mô tả các bước từ nhận yêu cầu khách hàng đến kết thúc đấu thầu (Xây dựng + MEP).

### Swimlanes (10 vai trò)
| Vai trò | Scope |
|---------|-------|
| Khách hàng | External |
| P. Đấu thầu (P.ĐT) | Central |
| P. QLKTTK (Quản lý Kỹ thuật Thiết kế) | Central |
| TTQLTK (Trung tâm Quản lý Thiết kế) | Central |
| P. TB (Phòng Thiết bị) | Central |
| Ban An toàn | Central |
| Ban Pháp chế | Central |
| P. TCKT (Tài chính Kế toán) | Central |
| GĐĐH (Giám đốc Điều hành) | Central |
| TGĐ (Tổng Giám đốc) | Central |

### Luồng chính (26 bước)
```
KH yêu cầu → P.ĐT đánh giá CĐT/DA → TGĐ duyệt
    → KH mới? → Khai báo KH → Khai báo DA
    → Khảo sát hiện trường → Kickoff meeting
    → Các phòng ban song song:
        - Làm giá/Tính KL (P.ĐT)
        - Biện pháp thi công (P.QLKTTK)
        - Thiết kế (TTQLTK)
        - Chi phí thiết bị (P.TB)
        - An toàn (Ban AT)
        - Pháp lý (Ban PC)
        - Tham vấn giá (P.C&C)
        - Hồ sơ tài chính (P.TCKT)
    → Tập hợp HSDT → GĐĐH duyệt → Nộp thầu
    → Trúng thầu? (Y: PROJ.4 / N: Ghi lý do)
    → Phân công nhân sự → TGĐ duyệt
```

### Decision Points
| # | Điều kiện | Y | N |
|---|-----------|---|---|
| DP1 | TGĐ duyệt đánh giá CĐT? | Tiếp tục | Kết thúc |
| DP2 | Khách hàng mới? | Khai báo KH | Khai báo DA |
| DP3 | GĐĐH duyệt HSDT? | Nộp thầu | Sửa HSDT |
| DP4 | Trúng thầu? | PROJ.4 | Ghi lý do trượt |

### SLA
- P.ĐT báo yêu cầu đặc biệt: **trong 2 ngày** kể từ nhận HSMT
- Bảo lãnh dự thầu: **trước 3 ngày làm việc**

---

## PROJ.2 — Quản lý Thông tin Đấu thầu Design & Build (Trang 17-23)

### Mục đích
Quy trình đấu thầu cho dự án Thiết kế thi công (Design & Build). Tương tự PROJ.1 nhưng thêm phần thiết kế.

### Swimlanes
Tương tự PROJ.1 + TTQLTK có vai trò lớn hơn (thiết kế từ đầu).

### Điểm khác biệt so với PROJ.1
- Có thêm bước **Thiết kế sơ bộ** trước khi tính khối lượng
- BOQ được lập dựa trên thiết kế nội bộ, không từ CĐT
- Phối hợp chặt hơn giữa P.ĐT ↔ TTQLTK

---

## PROJ.3 — Khai báo Công tác Mới (Trang 24-25)

### Mục đích
Khai báo các công tác (Work Items) mới trên ERP khi dự án phát sinh công việc mới.

### Swimlanes (3 vai trò)
| Vai trò | Hành động |
|---------|-----------|
| BCH CT / P.ĐT | Đề nghị khai báo công tác mới |
| P. C&C | Kiểm tra, khai báo trên ERP |
| GĐDA | Duyệt công tác mới |

### Luồng
```
BCH/P.ĐT đề nghị → P.C&C kiểm tra → Đã có? (Y: Kết thúc / N: Khai báo mới)
    → GĐDA duyệt → Hệ thống cho phép sử dụng
```

---

## PROJ.4 — Khai báo Thông tin DA sau khi Trúng thầu (Trang 26-29)

### Mục đích
Sau khi trúng thầu, khai báo đầy đủ thông tin dự án lên ERP.

### Swimlanes (4 vai trò)
| Vai trò | Hành động |
|---------|-----------|
| P. Đấu thầu | Cập nhật thông tin DA, chuyển giao |
| GĐDA | Duyệt, phân công nhân sự |
| P. C&C | Khai báo ngân sách, công tác |
| BCH CT | Nhận bàn giao, triển khai |

### Luồng
```
P.ĐT cập nhật DA (giá trúng, HĐ, tiến độ) → GĐDA duyệt
    → P.C&C khai báo ngân sách (BUD.2)
    → Phân công CHT, nhân sự BCH
    → Bàn giao hồ sơ cho BCH CT
    → BCH CT triển khai thi công
```

### Dữ liệu khai báo
- Thông tin chung DA: Mã, tên, CĐT, địa điểm, loại CT
- Giá trị trúng thầu, HĐ đã ký
- Tiến độ tổng thể
- Ngân sách chi tiết theo hạng mục
- Nhân sự dự án

---

## PROJ.5 — Quản lý NCC/NTP (Trang 30-33)

### Mục đích
Quy trình đánh giá, khai báo và quản lý danh sách Nhà cung cấp / Nhà thầu phụ.

### Swimlanes (3 vai trò)
| Vai trò | Hành động |
|---------|-----------|
| Các phòng ban | Yêu cầu mở mã NCC/NTP |
| P. QLNTP / P.C&C / P.TB | Đánh giá, khai báo, quản lý KPI |
| Ban TGĐ (BTGĐ) | Duyệt danh sách NCC/NTP không đạt |

### Luồng
```
Yêu cầu mở mã (qua email) → P.QLNTP đánh giá
    → Đạt? (Y: Khai báo + KPI / N: Kết thúc)
    → Định kỳ 6 tháng: Đánh giá KPI
    → Không đạt? → Lập DS → BTGĐ duyệt
    → Duyệt? (Y: Không ký mới / N: Đánh giá lại)
    → Hết thời gian cấm → Có thể tái đánh giá
```

### Business Rules
- KPI đánh giá **định kỳ 6 tháng**
- NCC/NTP không đạt → cấm ký mới trong thời gian quy định
- Muốn tái sử dụng → phải quay lại đánh giá KPI

---

## PROJ.6 — Quản lý Kế hoạch Ký kết HĐ với NCC/NTP (Trang 34-36)

### Mục đích
Quy trình phê duyệt kế hoạch ký kết hợp đồng NTP/NCC qua nhiều cấp.

### Swimlanes (5 cấp duyệt)
```
P.C&C lập KH → CHT duyệt → GĐDA/P.TB/P.QLNTP/P.ĐT duyệt → GĐĐH duyệt → TGĐ duyệt
```

### Decision Points
Mỗi cấp: Duyệt (Y → tiếp) / Không duyệt (N → trả về sửa)

### Điều kiện tiên quyết
- Đã có thông tin ngân sách dự án (BUD.2)
- CHT lập KH theo mẫu đã ban hành, tuỳ tình trạng ký HĐ CĐT

---

## PROJ.7 — Quản lý Đơn giá Mua Thầu phụ (Trang 37-39)

### Mục đích
Quản lý bảng giá NTP: nhập giá, so sánh, kiểm tra, duyệt trên ERP.

### Swimlanes (3 vai trò)
| Vai trò | Hành động |
|---------|-----------|
| BCH CT / P.QLNTP | Nhập bảng giá NTP |
| CV P.C&C / P.QLNTP | Kiểm tra, soát xét (bảng so sánh giá) |
| GĐDA / TP C&C | Duyệt bảng giá |

### Luồng
```
Tiền đề: Đã khai báo NTP (PROJ.5) + Đã khai báo công tác (PROJ.3)
    → BCH nhập bảng giá → CV C&C so sánh giá (vs BoQ CĐT)
    → GĐDA/TP C&C duyệt? (Y: PUR.1.3 / N: Sửa giá)
```

### Business Rules
- **Tại 1 thời điểm, hệ thống chỉ cho phép 1 bảng giá có hiệu lực** cho mỗi NTP
- Bảng giá đã duyệt → căn cứ quản lý giá trên HĐ

---

## PROJ.8 — Quản lý Sự Không Phù Hợp / NCR (Trang 40-44)

### Mục đích
Ghi nhận, phân loại, xử lý và theo dõi NCR (Non-Conformance Report) tại công trình.

### Swimlanes (4 vai trò)
| Vai trò | Hành động |
|---------|-----------|
| P.QLKTTC / Ban AT / Ban AN / CHT | Phát hiện, phân loại NCR |
| CHT | Ghi nhận gói thầu + giám sát, phân công xử lý |
| Người xử lý | Xử lý + đính kèm hình ảnh |
| GĐDA | Quyết định phạt NCC/NTP |

### Phân loại NCR (3 loại × 5 cấp)
| Loại | Cấp độ màu |
|------|-----------|
| Chất lượng dự án | Xanh → Vàng → Cam → Đỏ → Đỏ thẫm |
| Tiến độ dự án | Xanh → Vàng → Cam → Đỏ → Đỏ thẫm |
| An toàn | Xanh → Vàng → Cam → Đỏ → Đỏ thẫm |

### Luồng
```
Phát hiện NCR → Phân loại mức độ
    → Sự cố an toàn? (Y: Đội ứng phó / N: Tiếp)
    → Ghi nhận theo 5 cấp: công việc / hạng mục / HĐ NTP / dự án / công ty
    → Đính kèm hình ảnh
    → CHT: Xác định gói thầu + giám sát → Phân công xử lý
    → GĐDA: Phạt? (Y: Ghi nhận tiền phạt → PROJ.10 / N: Tiếp)
    → Người xử lý thực hiện + đính hình ảnh sau xử lý
    → P.QLKTTC kiểm tra:
        Chấp nhận (Y) → Bỏ cờ NCR
        Không chấp nhận (N) → Ghi lý do → Xử lý lại
    → Báo cáo NCR
```

### Kết nối
- NCR có phạt → khấu trừ qua PROJ.10 (Thanh toán NTP)

---

## PROJ.9 — Quản lý Tạm ứng NCC/NTP (Trang 45-47)

### Mục đích
Quy trình tạm ứng cho NCC/NTP theo điều kiện hợp đồng.

### Swimlanes (6 vai trò)
| # | Vai trò | Hành động |
|---|---------|-----------|
| 1 | NTP | Đề nghị tạm ứng theo HĐ (ngoài ERP) |
| 2 | QS Công trình | Nhập phiếu ĐNTU + đính kèm hồ sơ |
| 3 | CHT | Duyệt |
| 4 | GĐDA | Duyệt |
| 5 | CV C&C / TP C&C (TBP QLCP) | Duyệt |
| 6 | KT Công trình | Kiểm tra + Duyệt → FIN.4 (Chi tiền) |

### Chuỗi phê duyệt (5 cấp)
```
QS nhập → CHT duyệt → GĐDA duyệt → CV C&C duyệt → TP C&C duyệt → KT CT duyệt → FIN.4
```

### Điều kiện tiên quyết
- Đã có HĐ (PUR.1.3)

---

## PROJ.10 — Ghi nhận Thanh toán NCC/NTP (Trang 48-52)

> **Chi tiết đầy đủ:** Xem `docs/specs/central-cons-payment-flow.md`

### Tóm tắt 7 vai trò, 15 bước, 5 Decision Points
```
NTP trình KL → GSHT kiểm tra → [Trong HĐ? Vượt NS? Giao thêm?]
    → QS tổng hợp + Lập HSTT (trước 5/tháng)
    → CHT duyệt (trước 7/tháng)
    → GĐDA duyệt (SLA: 2 ngày)
    → C&C kiểm tra + xác nhận (SLA: 4 ngày)
    → QS thông báo NTP xuất HĐ → FIN.1
    → KT CT in ĐNTT
```

---

## PROJ.12 — Chi phí Trực tiếp tại Công trình / BCH (Trang 53-56)

### Mục đích
Phê duyệt chi phí trực tiếp chi tại công trình: tiền cơm, tiếp khách, đồ dùng, vật tư lẻ...

### Swimlanes (7 vai trò)
| # | Vai trò | Hành động |
|---|---------|-----------|
| 1 | Bộ phận liên quan | Tập hợp chứng từ |
| 2 | Thư ký CT (kiêm KT) | Nhập chứng từ phải trả BCH, xuất bảng giải chi |
| 3 | CHT | Duyệt (SLA: 2 ngày) |
| 4 | CV C&C | Duyệt |
| 5 | TP C&C | Duyệt (SLA: 4 ngày) |
| 6 | GĐDA | Duyệt (SLA: 2 ngày) |
| 7 | CV Kế toán CT | Kiểm tra, duyệt chứng từ → Lập ĐNTT → FIN.4 |

### SLA chi tiết
| Vai trò | Thời hạn |
|---------|----------|
| Thư ký CT kiểm tra | Ngày 11-14 hoặc ngày 27-30 hàng tháng |
| CHT duyệt | 2 ngày |
| P. C&C kiểm tra | 4 ngày |
| GĐDA duyệt | 2 ngày |
| KT CT kiểm tra + duyệt | Ngày 15 hoặc ngày 30 hàng tháng |

---

## PROJ.13 — Quản lý Bảo hành, Bảo trì (Trang 57-60)

### Mục đích
Quản lý BHBT các dự án đã bàn giao (có TOC — Taking Over Certificate).

### Swimlanes (3 vai trò)
| Vai trò | Hành động |
|---------|-----------|
| Khách hàng | Yêu cầu BHBT |
| GĐDA | Tiếp nhận, kiểm tra, phối hợp BCH, quyết định |
| BCH CT + NCC/NTP | Thực hiện sửa chữa |

### Luồng
```
KH yêu cầu BHBT → GĐDA tiếp nhận + ghi hình ảnh
    → Phối hợp BCH kiểm tra: Do NCC/NTP hay do sử dụng?
    → Do NCC/NTP (Y):
        → Chuyển NTP → NTP đồng ý sửa?
            Y: NTP sửa
            N: Kiểm tra tiền giữ BHBT → Tìm NTP khác sửa + khấu trừ
    → Do sử dụng (N):
        → Có sửa? (Y: Thông báo NTP → BUD.2/PUR.1.3)
        → Không sửa: Thông báo KH (không thuộc phạm vi BHBT)
    → Cập nhật trạng thái BHBT
```

### Kết nối
- BUD.2: Khi cần chi phí bổ sung cho BHBT
- PUR.1.3 / FIN.1: Khi cần ký HĐ sửa chữa + thanh toán

---

## Tổng hợp Chuỗi Phê duyệt (Approval Chains)

| Quy trình | Chuỗi phê duyệt | SLA |
|-----------|-----------------|-----|
| **PROJ.1** Đấu thầu | TGĐ → GĐĐH | 3 ngày BL dự thầu |
| **PROJ.3** Công tác mới | P.C&C → GĐDA | — |
| **PROJ.5** NCC/NTP không đạt | P.QLNTP → BTGĐ | 6 tháng/lần |
| **PROJ.6** KH ký HĐ | P.C&C → CHT → GĐDA → GĐĐH → TGĐ | — |
| **PROJ.7** Đơn giá NTP | BCH → CV C&C → GĐDA/TP C&C | — |
| **PROJ.8** NCR phạt | CHT → GĐDA (phạt) → P.QLKTTC (close) | — |
| **PROJ.9** Tạm ứng | QS → CHT → GĐDA → CV C&C → TP C&C → KT CT | — |
| **PROJ.10** Thanh toán NTP | GSHT → QS → CHT → GĐDA → C&C → QS/KT | QS: 5/tháng, CHT: 7/tháng, GĐDA: 2d, C&C: 4d |
| **PROJ.12** Chi BCH | TK CT → CHT → CV C&C → TP C&C → GĐDA → KT CT | CHT: 2d, C&C: 4d, GĐDA: 2d |
| **PROJ.13** Bảo hành | GĐDA (quyết định toàn bộ) | — |

---

## Tổng hợp Vai trò xuất hiện qua tất cả quy trình

| Vai trò | Scope | Xuất hiện trong |
|---------|:-----:|-----------------|
| **TGĐ** (Tổng Giám đốc) | CENTRAL | PROJ.1, PROJ.6 |
| **GĐĐH** (GĐ Điều hành) | CENTRAL | PROJ.1, PROJ.6 |
| **GĐDA** (GĐ Dự án) | CENTRAL | PROJ.3,4,6,7,8,9,10,12,13 |
| **TP C&C** (Trưởng phòng C&C) | CENTRAL | PROJ.6,7,9,10,12 |
| **CV C&C** (Chuyên viên C&C) | CENTRAL | PROJ.7,9,10,12 |
| **P.ĐT** (Phòng Đấu thầu) | CENTRAL | PROJ.1,2,4 |
| **CHT** (Chỉ huy trưởng) | SITE | PROJ.6,8,9,10,12 |
| **QS Công trình** | SITE | PROJ.9,10 |
| **GSHT** (Giám sát Hiện trường) | SITE | PROJ.10 |
| **KT CT** (Kế toán Công trình) | SITE | PROJ.9,10,12 |
| **TK CT** (Thư ký Công trình) | SITE | PROJ.12 |
| **P.QLKTTC** (QL Kỹ thuật TC) | CENTRAL | PROJ.1,8 |
| **P.TB** (Phòng Thiết bị) | CENTRAL | PROJ.1,6 |
| **P.QLNTP** (QL Nhà thầu phụ) | CENTRAL | PROJ.5,7 |
| **Ban An toàn** | CENTRAL | PROJ.1,8 |
| **BCH CT** (Ban Chỉ huy) | SITE | PROJ.4,6,7,12,13 |

---

## Quy trình liên kết ngoài Module PROJ

| Mã | Tên | Liên kết từ |
|----|-----|-------------|
| **BUD.2** | Quản lý Ngân sách Dự án | PROJ.4, PROJ.6, PROJ.10, PROJ.13 |
| **PUR.1.3** | Quản lý HĐ tại Công trình | PROJ.5, PROJ.6, PROJ.7, PROJ.9, PROJ.10, PROJ.13 |
| **FIN.1** | Quản lý Hoá đơn Phải trả | PROJ.5, PROJ.10, PROJ.13 |
| **FIN.4** | Quy trình Chi tiền qua Chứng từ Công nợ | PROJ.9, PROJ.12 |

---

> **Lưu ý cho Developer:** File này là nguồn sự thật duy nhất cho tất cả approval workflows trong SH ERP.
> Mọi luồng phê duyệt phải đối chiếu với bảng "Tổng hợp Chuỗi Phê duyệt" ở trên.
