# Token Usage Tracker — SH ERP Project

> **Skill:** Project Metrics & Token Tracker
> **Ngưỡng an toàn:** < 150k tokens/session
> **Ngưỡng cảnh báo:** > 170k tokens (cần `/compact`)
> **Ngưỡng tới hạn:** > 190k tokens (bắt buộc dừng + tối ưu)

---

## Tổng quan dự án (tính đến 2026-03-26)

| Metric | Giá trị |
|--------|--------:|
| Conversations | 8 |
| Subagents | 27 |
| API calls | 3,677 |
| Total tokens | ~576M |
| Est. cost | ~$1,374 |

---

## Session hiện tại (Conversation #8)

| Ngày/Giờ | Gate | Task Description | Input Tokens | Output Tokens | Tổng cộng | Ghi chú |
|:----------|:-----|:-----------------|:-------------|:--------------|:----------|:--------|
| 2026-03-26 09:00 | SA | Refactor .claude Architecture (rules, commands, agents) | ~15k | ~3k | ~18k | Tạo 5 rules + review.md + CLAUDE.md |
| 2026-03-26 09:30 | BA | Hard Limit Budget Control — BA_SPEC.md | ~20k | ~8k | ~28k | 5 stories, 5 rules, 4 bảng, 8 KPIs |
| 2026-03-26 10:00 | ALL | /review Cross-Gate Audit (Budget Control) | ~35k | ~5k | ~40k | Quét code + so sánh BA vs hiện trạng |
| 2026-03-26 10:15 | BA+SA | Auth Module — BA_SPEC + SA_DESIGN | ~25k | ~15k | ~40k | Lockout, Refresh Token, Audit Logs |
| 2026-03-26 10:30 | DEV | Auth Backend — Entities, Services, Migration | ~40k | ~12k | ~52k | 8 files, cookie-parser, migration run |
| 2026-03-26 10:45 | TEST | Auth Unit Tests — 5 scenarios | ~30k | ~4k | ~34k | 5/5 PASS |
| 2026-03-26 11:00 | DEPLOY | Auth Deploy + Emergency Unlock | ~25k | ~5k | ~30k | SQL reset, DB state verify |
| 2026-03-26 11:15 | DEV+TEST | Forgot Password + Contact IT | ~45k | ~15k | ~60k | Nodemailer, FE forms, 10/10 tests |
| 2026-03-26 11:45 | DEV | System Rebranding SH-WMS → SH ERP | ~20k | ~4k | ~24k | 10 files, constants, 0 errors |
| 2026-03-26 12:00 | SA | RBAC 3 Roles (PD/PM/ACC) — 21 privileges | ~40k | ~10k | ~50k | Privilege matrix, SoD verified |
| 2026-03-26 12:30 | BA+SA | Org Chart & HR Foundation — IMPC | ~35k | ~12k | ~47k | 13 positions, 4 migrations planned |
| 2026-03-26 13:00 | BA | Central Cons PDF — All 12 Processes | ~50k | ~15k | ~65k | 60 pages, 16 roles, 10 approval chains |
| 2026-03-26 16:30 | DEV | Org Chart & HR Foundation — Phase 1 | ~35k | ~10k | ~45k | Position entity, OrgType enum, migration, seed 13 positions + 7 IMPC org units |
| 2026-03-26 17:00 | TEST | Phase 1 — Unit tests + Manual verify | ~20k | ~8k | ~28k | 39/39 PASS, 4 test suites, DB state verified |
| 2026-03-26 17:30 | DEPLOY | Phase 1 — Login scope resolution + FE store | ~25k | ~8k | ~33k | getProfile returns position/org_unit/project_scope, FE store updated |
| 2026-03-26 18:00 | ALL | Employee Actions — Delete/Status/Constraints | ~30k | ~12k | ~42k | 5 gates, 4/4 unit tests, 3/3 E2E, migration, soft delete |
| 2026-03-26 18:30 | ALL | Universal Audit Log System | ~35k | ~12k | ~47k | Entity+Service+Module (Global), AuditInterceptor, diff logic, E2E verified |
| 2026-03-27 21:45 | ALL | Phase 1 Finalization & Phase 2 Bridge | ~60k | ~20k | ~80k | 5 tasks: approval chain, system_settings, audit UI, migration #24, completion report |
| 2026-03-27 22:30 | DEV+TEST | Emergency UI Fix — Unicode + Action Buttons | ~40k | ~15k | ~55k | Fix \u escape bug, add Edit/Delete/Suspend, 27/27 selector PASS |
| 2026-03-28 00:00 | ALL | Excel Export Fix + Users/Roles CRUD + Permission Matrix | ~80k | ~25k | ~105k | Excel 27KB OK, UsersPage actions, RolesPage matrix dialog, self-protection, 19/19 PASS |

---

## Phân tích Token theo Gate

| Gate | Lần gọi | Tổng tokens (ước lượng) | % Total | Top consumer |
|------|:-------:|:-----------------------:|:-------:|-------------|
| BA | 4 | ~180k | 37% | PDF extraction (65k) |
| SA | 4 | ~155k | 32% | RBAC design (50k) |
| DEV | 3 | ~136k | 28% | Auth + Forgot Password (112k) |
| TEST | 1 | ~34k | 7% | Auth 10 scenarios |
| DEPLOY | 1 | ~30k | 6% | Emergency unlock + verify |
| /review | 1 | ~40k | 8% | Full codebase scan |

---

## Nhận xét hiệu quả

### Session này (~488k tokens ước lượng)
- **Nặng nhất:** Đọc PDF Central Cons 60 trang (~65k) — cần thiết, không tối ưu được
- **Nặng thứ 2:** Auth module full cycle BA→DEV→TEST (~156k) — nhiều file code
- **Hiệu quả cao:** Rebranding (~24k) — ít code, dùng Grep+Edit batch

### Đề xuất tối ưu cho lần sau
1. **PDF dài:** Đọc theo section cần thiết thay vì toàn bộ 60 trang
2. **Code generation:** Dùng boilerplate templates thay vì viết từ đầu
3. **Agent delegation:** Các subagent Explore tiêu ~30-50k mỗi lần — chỉ spawn khi cần deep search
4. **Compact:** Nên `/compact` sau mỗi Gate lớn (>50k) để giữ context gọn
