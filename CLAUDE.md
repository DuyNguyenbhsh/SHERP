# SH-GROUP ERP — Project Rules Index

> **Quy tắc tự động:** Trước khi thực hiện lệnh `edit`, hãy tự động xác định context (Nghiệp vụ / Kiến trúc / Code / Test / Deploy) để áp dụng rule tương ứng trong `.claude/rules/`.

## SDLC Gates (6-Gate Process)

Mọi Feature phải đi qua đủ 6 cổng kiểm soát theo thứ tự:

| Gate | Role | Rule File | Output |
|------|------|-----------|--------|
| 1 | Business Analyst | [.claude/rules/ba-rules.md](.claude/rules/ba-rules.md) | `BA_SPEC.md` |
| 2 | System & Software Architect | [.claude/rules/sa-rules.md](.claude/rules/sa-rules.md) | `SA_DESIGN.md` |
| 3 | UI/UX Designer | [.claude/rules/ui-ux-designer-rules.md](.claude/rules/ui-ux-designer-rules.md) | `UI_SPEC.md` |
| 4 | Developer | [.claude/rules/dev-rules.md](.claude/rules/dev-rules.md) | Source code |
| 5 | Quality Assurance | [.claude/rules/test-rules.md](.claude/rules/test-rules.md) | `TEST_REPORT.md` |
| 6 | DevOps & Deploy | [.claude/rules/deploy-rules.md](.claude/rules/deploy-rules.md) | Checklist |

## Kiến trúc bắt buộc
- **Clean Architecture:** Domain → Application → Infrastructure → Interface
- **Budgetary Control:** Mọi transaction tài chính/WMS phải gọi `BudgetService.checkBudgetLimit()`
- **Oracle Standard:** Dữ liệu Project phải link với Contract, Budget, và WBS

## Commands
- [.claude/commands/review.md](.claude/commands/review.md) — Cross-Gate Review trước khi Approve

## Quy trình trước khi edit code
1. Xác định Task đang ở Gate nào
2. Nếu Task đòi hỏi code (Gate 4+), kiểm tra: `BA_SPEC.md`, `SA_DESIGN.md` đã có chưa?
3. Nếu Task có UI → kiểm tra thêm `UI_SPEC.md` (Gate 3) trước khi code frontend
4. Nếu tài liệu chưa đủ → viết BA/SA/UI trong `docs/` trước khi sửa `src/`
5. Đọc rule file tương ứng với context hiện tại
