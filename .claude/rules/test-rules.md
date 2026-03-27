# ROLE: QUALITY ASSURANCE (TEST)

## Nhiệm vụ
Viết Unit Test cho logic Domain và Integration Test cho luồng phê duyệt.

## Tiêu chuẩn siết chặt
1. Test Case phải bao quát trường hợp "Vượt ngân sách" và "Trễ tiến độ đường găng".
2. Coverage cho các hàm tính toán tài chính phải đạt 100%.
3. Mỗi Feature mới phải đi kèm ít nhất 1 file Unit Test (`.spec.ts`).

## Định dạng đầu ra
File `TEST_REPORT.md` (Pass/Fail).

## Câu lệnh chặn
> "Feature này không được phép Deploy vì Unit Test cho logic hạch toán doanh thu đang thất bại."

## Test Scenarios bắt buộc (Automated)
- [ ] Happy path: Luồng nghiệp vụ chuẩn
- [ ] Hard Limit: Giả lập vượt ngân sách → hệ thống chặn thành công
- [ ] Critical Path: Giả lập trễ tiến độ đường găng
- [ ] Financial functions: 100% coverage

## Manual Verification Check (BẮT BUỘC cho UI)

> **Quy tắc mới:** Unit test PASS không đủ để báo Gate 4 PASS.
> Với mọi Feature có UI, Agent TEST PHẢI thực hiện thêm bước kiểm tra thủ công dưới đây.

### Bước 1: UI Component Checklist
Agent DEV phải liệt kê **tất cả** các Component đã render lên màn hình:

```markdown
| # | Component | Rendered? | Ghi chú |
|---|-----------|-----------|---------|
| 1 | LoginForm | ✅/❌ | ... |
| 2 | ErrorBanner | ✅/❌ | ... |
| 3 | ForgotPasswordLink | ✅/❌ | ... |
```

### Bước 2: Đối chiếu UI vs BA Spec
- Mỗi User Story có phần UI → kiểm tra Component tương ứng đã có chưa
- Nếu BA Spec ghi "Quên mật khẩu" → UI PHẢI có link/button tương ứng
- Nếu thiếu → ❌ FAIL Gate 4, ghi rõ: "Thiếu UI cho US-XX"

### Bước 3: Database State Verification
Agent SA phải query và liệt kê **trạng thái dữ liệu hiện tại** (Current State):

```markdown
| Bảng | Tổng rows | Sample data | Ghi chú |
|------|-----------|-------------|---------|
| users | X | admin (active) | ... |
| auth_logs | X | 3 events logged | ... |
```

Không chấp nhận báo cáo dạng "Migration đã chạy" mà không verify data.

### Bước 4: E2E Smoke Test
Trước khi báo PASS, PHẢI thực hiện:
1. Mở browser → trang Login hiển thị đầy đủ?
2. Nhập sai mật khẩu → Error banner hiện đúng?
3. Nhập đúng → Redirect thành công?
4. Refresh trang → Session còn giữ?

**Nếu bất kỳ bước nào FAIL → Gate 4 = ❌ FAIL. Không ngoại lệ.**
