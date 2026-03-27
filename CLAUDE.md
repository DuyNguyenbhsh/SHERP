# SH-GROUP ERP — Project Rules Index

> **Quy tắc tự động:** Trước khi thực hiện lệnh `edit`, hãy tự động xác định context (Nghiệp vụ / Kiến trúc / Code / Test / Deploy) để áp dụng rule tương ứng trong `.claude/rules/`.

## SDLC Gates (5-Gate Process)

Mọi Feature phải đi qua đủ 5 cổng kiểm soát theo thứ tự:

| Gate | Role | Rule File | Output |
|------|------|-----------|--------|
| 1 | Business Analyst | [.claude/rules/ba-rules.md](.claude/rules/ba-rules.md) | `BA_SPEC.md` |
| 2 | System & Software Architect | [.claude/rules/sa-rules.md](.claude/rules/sa-rules.md) | `SA_DESIGN.md` |
| 3 | Developer | [.claude/rules/dev-rules.md](.claude/rules/dev-rules.md) | Source code |
| 4 | Quality Assurance | [.claude/rules/test-rules.md](.claude/rules/test-rules.md) | `TEST_REPORT.md` |
| 5 | DevOps & Deploy | [.claude/rules/deploy-rules.md](.claude/rules/deploy-rules.md) | Checklist |

## Kiến trúc bắt buộc
- **Clean Architecture:** Domain → Application → Infrastructure → Interface
- **Budgetary Control:** Mọi transaction tài chính/WMS phải gọi `BudgetService.checkBudgetLimit()`
- **Oracle Standard:** Dữ liệu Project phải link với Contract, Budget, và WBS

## Commands
- [.claude/commands/review.md](.claude/commands/review.md) — Cross-Gate Review trước khi Approve

## Quy trình trước khi edit code
1. Xác định Task đang ở Gate nào
2. Nếu Task đòi hỏi code (Gate 3+), kiểm tra: BA_SPEC.md và SA_DESIGN.md đã có chưa?
3. Nếu chưa có → viết tài liệu BA/SA trong `docs/` trước khi sửa `src/`
4. Đọc rule file tương ứng với context hiện tại
