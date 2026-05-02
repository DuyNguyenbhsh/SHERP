# Tech Advisor Notes

Thư mục này chứa các ghi chú kiến trúc, decision records, và reference docs của Tech Advisor — phát sinh trong quá trình feature development, review, hoặc sau incident.

**Mục đích:** Không phải spec chính thức (xem `docs/features/`) — đây là **knowledge base** để Tech Advisor + dev team không lặp sai lầm cũ và có context nhanh khi onboard feature mới.

**Convention:** Mọi diagram dùng **Mermaid** (team đã cài VS Code extension — render inline trong `.md`).

---

## Index

| Doc | Mô tả | Triggered by |
|-----|-------|--------------|
| [frontend-auth-model.md](./frontend-auth-model.md) | 3-field scope paradigm của `useAuthStore` — anti-pattern khi fabricate `currentOrgId` | Gate 4B F3 incident (2026-04-24) |

---

## Khi nào add doc mới vào đây?

1. **Sau incident:** bug/mistake lặp lại được → ghi thành anti-pattern
2. **Kiến trúc cross-cutting concern:** auth, error handling, i18n, test infra — không thuộc 1 feature cụ thể
3. **Decision records:** "Tại sao chọn X thay vì Y" — quyết định kiến trúc dài hạn
4. **Reference map:** map giữa BE / FE concepts khi shape khác nhau (như `contexts` BE vs 3-field FE)

## Khi nào KHÔNG add?

- Feature-specific design → thuộc `docs/features/<feature>/SA_DESIGN.md`
- Temporary debug notes → chat với Tech Advisor, không commit
- Code-level implementation details → comments trong code

---

**Owner:** Tech Advisor
**Review cadence:** Mỗi khi feature branch close, check có note nào cần update không.
