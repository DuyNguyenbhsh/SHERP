# Hardening Backlog

Follow-up tickets phát sinh từ các pass audit (review session, /ultrareview, hậu Gate 6) — không scope vào feature đang chạy. Cập nhật khi có audit mới hoặc ticket close.

---

## BACKEND-BODY-PARSER-ROUTE-LEVEL-LIMIT
**Severity:** Low
**Source:** Audit commit b3bc6fa (body parser 50MB global)
**Description:** Global body parser 50MB có thể memory-spike khi user upload nhầm file lớn vào endpoint không cần (hầu hết JSON < 1MB). Narrow xuống route-level limit:
- /boq/import: 50MB
- /ncr/attachments: 10MB
- /master-plan/template: 50MB
- All others: 1MB default

**Impact:** Memory protection against OOM
**Effort:** 1-2h

## FE-ENTITY-PICKER-CONSUME-QUERYSTATEROW
**Severity:** Low
**Source:** Audit commit b883ae7 + Gate 4B EntityPicker error state
**Description:** EntityPicker (shared/ui/entity-picker/) hiện tự render Loading/Error/Empty inline. Trong khi shared/ui/QueryStateRow.tsx (added b883ae7) đã chuẩn hoá pattern này cho TableRow. Refactor EntityPicker consume QueryStateRow để DRY State Matrix logic — single source of truth.

**Impact:** Consistency, maintainability
**Effort:** 2-3h
**Note:** Tech Advisor đã ghi nhận overlap khi review b883ae7. Không scope cho feature/master-plan-project-lookup.

---

## QA-A3-500-INTERNAL-ERROR
**Severity:** High
**Source:** Wave 1 Batch 1.3 attempt 2026-05-09 — gate6-deploy-helper qa-critical-path
**Description:** Khi chạy `GET /projects/lookup?q=TOW` (test case A-3), backend trả HTTP 500 Internal Error thay vì 200 OK với items array.

**Cần investigate:**
- BE log lúc đó có stack trace gì
- Có phải do `f_unaccent` function chưa được tạo trong test DB không (migration chưa run)?
- Có phải pg_trgm extension chưa enable không?
- Có phải seed script chưa tạo project có `project_code` chứa "TOW" không?

**Steps to reproduce:**
1. Start backend local
2. Login user qa_regular, mint JWT
3. curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/projects/lookup?q=TOW"
4. Observe HTTP 500

**Impact:** Blocker cho Pre-Deploy QA verification — phải fix trước Gate 6 deploy
**Effort:** 1-2h investigate + 1-2h fix tùy root cause

---

## QA-THROTTLER-429-ON-LOOKUP
**Severity:** Medium
**Source:** Wave 1 Batch 1.3 attempt 2026-05-09
**Description:** Khi chạy QA helper batch test trên `/projects/lookup`, throttler trả 429 Too Many Requests sau ~10-20 requests liên tiếp. Config rate limiter quá chặt cho QA load testing.

**Options resolution:**
- **A.** Tăng rate limit cho `/projects/lookup` lên 100 req/phút (vẫn bảo vệ DoS)
- **B.** Thêm flag `BYPASS_THROTTLER_FOR_QA=true` trong env, throttler skip khi thấy
- **C.** QA helper script tự sleep 1s giữa mỗi request (slow & steady)

**Effort:** 0.5-1 ngày
**Note:** Liên quan ticket BACKEND-RATE-LIMIT-AUDIT — có thể merge thành 1 task

---

## R-017-MCP-PG-PACKAGE-COMMUNITY-DEPENDENCY
**Severity:** Low
**Source:** MCP Postgres setup 2026-05-09 — `mcp-postgres@latest` (community maintained)
**Description:** Đang dùng `mcp-postgres` package từ developer cá nhân (kristofer84, npm publish 2026-03-20). Active hiện tại nhưng:
- Không phải Anthropic official package
- `@modelcontextprotocol/server-postgres` (official) đã DEPRECATED — npm warn "Package no longer supported"
- Risk: dev có thể abandon package, không có SLA

**Mitigation hiện tại:** Chỉ dùng cho dev workflow (Tech Advisor + IT Audit query verification), không phải production runtime. Nếu package stop work, fallback về paste-output manual.

**Monitor:**
- Quarterly check npm publish history của `mcp-postgres`
- Watch GitHub releases của Anthropic cho official Postgres MCP successor
- Khi có official → migrate

**Effort migration future:** 30 phút (chỉ đổi `args` trong `.mcp.json`)
