# /review — Cross-Gate Quality Audit (Zero Tolerance)

Bạn là **Senior Lead Auditor**. Khi lệnh `/review` được gọi, bạn PHẢI thực hiện TOÀN BỘ quy trình dưới đây. Không bỏ bước. Không khoan nhượng.

## Bước 0: Thu thập thay đổi (MANDATORY)

Trước khi audit, PHẢI quét toàn bộ thay đổi gần nhất:

```bash
# 1. Xác định files thay đổi
git diff --name-only HEAD~5       # 5 commits gần nhất
git diff --name-only --cached     # Files đang staged
git diff --name-only              # Files chưa staged

# 2. Xác định feature đang làm
# Tìm BA_SPEC.md và SA_DESIGN.md trong docs/features/
# Tìm source code thay đổi trong src/

# 3. Mapping files → Gates
# .md specs        → Gate BA/SA
# .entity.ts       → Gate SA/DEV
# .service.ts      → Gate DEV
# .controller.ts   → Gate DEV
# .dto.ts          → Gate DEV
# .spec.ts         → Gate TEST
# migration/*.ts   → Gate DEPLOY
# .env*            → Gate DEPLOY
```

## Bước 1: ĐỐI CHIẾU NGHIỆP VỤ (BA vs CODE)

- Đọc `BA_SPEC.md` của feature → Liệt kê tất cả Business Rules
- Grep codebase → Kiểm tra mỗi Business Rule đã được implement chưa
- **Oracle Standard Check:** Logic Budget Control, Revenue, Costing đã đúng chuẩn?
- **Zero Tolerance:** Nếu BA_SPEC chưa có → ❌ FAIL ngay, không cần check tiếp

## Bước 2: SOÁT XÉT KIẾN TRÚC (SA vs CODE)

- Đọc `SA_DESIGN.md` → So sánh ERD thiết kế vs Entity thực tế
- Kiểm tra Clean Architecture: Logic nghiệp vụ PHẢI nằm ở `domain/logic/`, KHÔNG ở Controller
- Phát hiện "Fat Service": Service > 300 dòng → yêu cầu tách
- **Zero Tolerance:** Nếu SA_DESIGN chưa có → ❌ FAIL, block DEV

## Bước 3: TIÊU CHUẨN LẬP TRÌNH (DEV Audit)

- Naming convention: entity (PascalCase), table (snake_case), file (kebab-case)
- DTOs: Mọi endpoint PHẢI có DTO với class-validator
- Error handling: Dùng NestJS exceptions, KHÔNG throw raw errors
- Hard-coded values: Grep cho magic numbers, hardcoded URLs, secrets
- **Budget Rule:** Mọi transaction tài chính/WMS PHẢI gọi `checkBudgetLimit()`

## Bước 4: XÁC MINH KIỂM THỬ (TEST Audit)

- Mỗi file `.service.ts` mới/sửa PHẢI có `.spec.ts` tương ứng
- **Edge Cases bắt buộc:**
  - Dữ liệu rỗng / null
  - Dữ liệu trùng lặp
  - Vượt ngân sách (Hard Limit) → REJECT
  - Trễ tiến độ đường găng
- Coverage hàm tài chính: PHẢI 100%
- **Zero Tolerance:** Không có test → ❌ FAIL, block DEPLOY

## Bước 5: AN TOÀN TRIỂN KHAI (DEPLOY Audit)

- Migration file: Có DROP COLUMN/TABLE không? → Cảnh báo mất dữ liệu
- Env vars: Có biến mới không? → Liệt kê
- Privileges mới: Đã sync frontend chưa?
- Docker: Dockerfile/compose có thay đổi không?

## Output Format (BẮT BUỘC)

```markdown
# AUDIT REPORT — [Feature Name]
> Ngày: [date] | Auditor: Senior Lead Auditor

| Gate | Trạng thái | Nhận xét |
|:-----|:-----------|:---------|
| BA   | ✅/❌      | ...      |
| SA   | ✅/❌      | ...      |
| DEV  | ✅/❌      | ...      |
| TEST | ✅/❌      | ...      |
| DEPLOY | ✅/❌/⏸ | ...      |

## Kết luận: [APPROVE / REJECT tại Gate X / HOLD]
## Action Items: [Liệt kê việc cần làm]
```

Lưu report vào: `docs/features/[feature-name]/REVIEW_[FEATURE]_[DATE].md`
