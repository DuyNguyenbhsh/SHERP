# TEST CASES — Module Chứng từ Tập trung & Lịch sử Tờ trình

> Ngày: 2026-04-10 | Tester: Duy

---

## 1. Upload chứng từ

| # | Test Case | Bước thực hiện | Kết quả mong đợi |
|---|-----------|----------------|-------------------|
| 1.1 | Upload file hợp lệ (PDF) | Tạo tờ trình → Kéo thả file PDF vào vùng upload → Bấm "Gửi & Đính kèm" | File hiện trong danh sách chứng từ, có icon PDF, tên file, dung lượng, người upload |
| 1.2 | Upload ảnh (JPG/PNG) | Chọn file ảnh → Submit | Hiện thumbnail ảnh thay vì icon |
| 1.3 | Upload Excel | Chọn file .xlsx → Submit | Hiện icon Excel màu xanh lá |
| 1.4 | Upload nhiều file cùng lúc | Chọn 3 file → Submit | Cả 3 file hiện trong danh sách |
| 1.5 | File quá lớn (>10MB) | Chọn file 15MB | Toast lỗi: "quá lớn...Tối đa 10MB" |
| 1.6 | File không hợp lệ (.exe) | Chọn file .exe | Toast lỗi: "không được hỗ trợ" |
| 1.7 | Xóa file trước khi submit | Chọn file → Bấm X trên file → Submit | File bị xóa không được upload |

## 2. Hiển thị chứng từ (DocumentList)

| # | Test Case | Kết quả mong đợi |
|---|-----------|-------------------|
| 2.1 | Click tên file | Mở file trong tab mới (Cloudinary URL) |
| 2.2 | Hiển thị metadata | Thấy: tên file, dung lượng, người upload, thời gian |
| 2.3 | Tag "Người đề xuất" | File upload bởi proposer có badge xám "Người đề xuất" |
| 2.4 | Tag "BP Duyệt bổ sung" | File upload bởi approver có badge xanh "BP Duyệt bổ sung" |
| 2.5 | Ảnh hiện thumbnail | File .jpg/.png hiện ảnh nhỏ thay vì icon |

## 3. Phê duyệt + Đính kèm

| # | Test Case | Bước thực hiện | Kết quả mong đợi |
|---|-----------|----------------|-------------------|
| 3.1 | Duyệt không file | Bấm "Trưởng BP Duyệt" | Duyệt bình thường, nút chữ "Trưởng BP Duyệt" |
| 3.2 | Duyệt có file | Chọn file → Nút đổi thành "Duyệt & Đính kèm" → Bấm | Loading spinner → Upload → Duyệt → Toast thành công |
| 3.3 | Loading state | Bấm "Duyệt & Đính kèm" | Nút disabled + Loader2 spinner quay |
| 3.4 | Modal chỉ đóng khi xong | Trong lúc upload | Modal không đóng, nút disabled |

## 4. Bảo vệ dữ liệu (Data Integrity)

| # | Test Case | Kết quả mong đợi |
|---|-----------|-------------------|
| 4.1 | Xóa file khi DRAFT | Hover file → Icon xóa hiện → Bấm → Xóa thành công |
| 4.2 | Xóa file khi PENDING_INFO | Cho phép xóa (vẫn đang sửa) |
| 4.3 | Xóa file khi SUBMITTED | Nút xóa KHÔNG hiện (canDelete=false) |
| 4.4 | Xóa file khi DEPLOYED | Nút xóa KHÔNG hiện |
| 4.5 | API xóa khi đã duyệt | Gọi trực tiếp DELETE API | HTTP 400: "Không thể xóa khi đã duyệt" |
| 4.6 | Upload trùng URL | Upload cùng file 2 lần | DB chỉ lưu 1 record (chống duplicate) |

## 5. Lịch sử hoạt động (Activity Log Timeline)

| # | Test Case | Kết quả mong đợi |
|---|-----------|-------------------|
| 5.1 | Tạo tờ trình | Timeline hiện: "Duy — Gửi đề xuất — 10:00" |
| 5.2 | Upload file | Timeline hiện: "Duy — Tải lên chứng từ — file_A.pdf (link xanh click được)" |
| 5.3 | Yêu cầu bổ sung | Timeline hiện: "Trưởng BP — Yêu cầu bổ sung — (lý do)" badge vàng |
| 5.4 | Duyệt + đính kèm | Timeline hiện cả 2: upload event (tím) + approve event (xanh) |
| 5.5 | Thứ tự sắp xếp | Mới nhất lên đầu (DESC by timestamp) |
| 5.6 | Màu sắc dot | Xanh=Duyệt, Đỏ=Từ chối, Vàng=Yêu cầu BS, Tím=Upload, Cyan=Gửi lại |

## 6. Validation Frontend

| # | Test Case | Input | Kết quả |
|---|-----------|-------|---------|
| 6.1 | PDF hợp lệ | report.pdf (2MB) | ✅ Chấp nhận |
| 6.2 | Ảnh hợp lệ | photo.jpg (5MB) | ✅ Chấp nhận |
| 6.3 | ZIP hợp lệ | docs.zip (8MB) | ✅ Chấp nhận |
| 6.4 | File quá lớn | video.mp4 (15MB) | ❌ "quá lớn" |
| 6.5 | File exe | malware.exe | ❌ "không được hỗ trợ" |
| 6.6 | Không chọn file | Bấm submit | Upload bình thường (0 files, skip upload) |

---

## Checklist tổng hợp

- [ ] Upload zone hiện cho cả 3 role: Proposer (DRAFT), Approver (SUBMITTED/DEPT_APPROVED), Resubmit (PENDING_INFO)
- [ ] DocumentList hiện icon đúng theo định dạng file
- [ ] Click file → mở tab mới
- [ ] Nút duyệt đổi thành "Duyệt & Đính kèm" khi có file
- [ ] Loading spinner trên nút khi đang upload
- [ ] Chặn xóa file sau khi duyệt (cả UI lẫn API)
- [ ] Không lưu trùng file trong DB
- [ ] Activity Log timeline hiện đầy đủ tất cả sự kiện
- [ ] Validation file type + size trước khi gửi
- [ ] Dòng "Đang dùng Cloudinary để lưu trữ" hiện bên dưới upload zone
