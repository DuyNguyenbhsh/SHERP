# ADDENDUM — Xử lý Working Tree trước khi tiếp tục Gate 2

**Context:** Pre-flight check phát hiện 3 vấn đề. Tech Advisor đã quyết định. Thực hiện chính xác các bước sau trước khi viết SA_DESIGN.

---

## QUYẾT ĐỊNH TECH ADVISOR

- **Option B** được chọn: BA_SPEC + SA_DESIGN cùng nằm trên 1 branch feature, 2 commit riêng biệt.
- **Branch name đổi:** `feature/master-plan-project-lookup` (bỏ suffix `-sa`).
- **2 file modified của feature master-plan CŨ:** KHÔNG đụng, phải stash để bảo toàn.
- **Thư mục `docs/claude-code-prompts/`:** commit chung trong branch feature này.

---

## THỨ TỰ THỰC THI (NGHIÊM NGẶT)

### Bước 1 — Bảo toàn 2 file modified không rõ nguồn gốc

```bash
git stash push -m "PRESERVE: unknown modifications on master-plan (old feature) docs - pending investigation by Tech Advisor" -- docs/features/master-plan/BA_SPEC.md docs/features/master-plan/SA_DESIGN.md
```

Verify:
```bash
git status                  # Không còn thấy 2 file master-plan cũ modified
git stash list              # Phải thấy stash vừa tạo
```

**TUYỆT ĐỐI KHÔNG** `git restore` / `git checkout --` / `git reset` 2 file này. Stash là cách duy nhất.

### Bước 2 — Tạo feature branch từ main

```bash
git checkout main
git pull --ff-only origin main          # đồng bộ main mới nhất
git checkout -b feature/master-plan-project-lookup
```

Verify:
```bash
git branch --show-current               # phải in: feature/master-plan-project-lookup
git log --oneline -3                    # hiển thị 3 commit mới nhất của main
```

### Bước 3 — Commit Gate 1 (BA_SPEC) lên branch

```bash
git add docs/features/master-plan-project-lookup/BA_SPEC.md
git commit -m "docs(master-plan): add BA_SPEC for project lookup feature (Gate 1)

- Define 5 user stories for project LOV in Master Plan creation
- Specify business rules: RBAC org filter, status whitelist, budget soft warning
- List KPI metrics for UX improvement measurement
- Survey 8 IN-SCOPE + 9 FUTURE forms for EntityPicker adoption
- Define BR-MPL-05: Vietnamese business error messages (no technical leak)

Refs: #master-plan-project-lookup"
```

### Bước 4 — Commit thư mục claude-code-prompts (Tech Advisor artifact)

```bash
git add docs/claude-code-prompts/
git commit -m "docs(process): add Claude Code CLI execution prompts for project lookup feature

Tech Advisor artifacts for 6-Gate SDLC execution:
- Gate 1 prompt: BA_SPEC
- Gate 2 prompt: SA_DESIGN
- Gate 2 addendum: working tree cleanup and branch policy

These prompts are audit trail for AI-assisted gate execution."
```

### Bước 5 — Bây giờ mới bắt đầu viết SA_DESIGN

Thực hiện toàn bộ mục **DELIVERABLE** và **EXECUTION PROTOCOL** trong file gốc `FEATURE-master-plan-project-lookup-GATE2-SA.md` — TỪ "BƯỚC 3" TRỞ ĐI (bỏ qua pre-flight và branch checkout vì đã làm ở trên).

Output: `docs/features/master-plan-project-lookup/SA_DESIGN.md`.

### Bước 6 — Commit SA_DESIGN

```bash
git add docs/features/master-plan-project-lookup/SA_DESIGN.md
git commit -m "docs(master-plan): add SA_DESIGN for project lookup feature (Gate 2)

- Define GET /projects/lookup endpoint contract with pagination and search
- Plan VIEW_ALL_PROJECTS privilege migration (seed for SUPER_ADMIN)
- Design 2-tier EntityPicker (shared) + ProjectPicker (entities) architecture
- Map technical errors to Vietnamese business messages (BR-MPL-05)
- V1 org visibility: exact match only; V2 subtree backlogged
- Performance target P95 < 300ms at 10k projects; pg_trgm index plan

Refs: #master-plan-project-lookup
Gate-2-Ready-For-Review: true"
```

### Bước 7 — DỪNG. Báo cáo

Format báo cáo cuối:

```
GATE 2 COMPLETE — READY FOR TECH ADVISOR REVIEW

Branch: feature/master-plan-project-lookup
Commits on branch (newest first):
1. <hash> docs(master-plan): add SA_DESIGN ...
2. <hash> docs(process): add Claude Code CLI execution prompts ...
3. <hash> docs(master-plan): add BA_SPEC ...

Stash preserved: <stash ref>
- docs/features/master-plan/BA_SPEC.md (old feature, modified, origin unknown)
- docs/features/master-plan/SA_DESIGN.md (old feature, modified, origin unknown)

SA_DESIGN location: docs/features/master-plan-project-lookup/SA_DESIGN.md

Key technical decisions:
- <3-5 bullets tóm tắt>

Open Technical Concerns (nếu có):
- <flag bất cứ điểm nào SA thấy risk>

Next gate: Gate 3 (UI_SPEC) - awaiting Tech Advisor approval.
```

---

## NHỮNG VIỆC CẤM TUYỆT ĐỐI

- CẤM `git push` trong lệnh này. Chỉ commit local. Tech Advisor sẽ push sau khi review.
- CẤM đụng (restore/reset/checkout) 2 file stashed.
- CẤM merge, rebase, squash trên branch này.
- CẤM tạo bất kỳ file code `.ts` nào trong `src/`.
- CẤM chạy migration thật.
- CẤM tự sang Gate 3.

---

## CHECKLIST TỰ VERIFY TRƯỚC KHI BÁO CÁO

- [ ] Stash có chứa 2 file của feature master-plan cũ
- [ ] `git status` working tree sạch (trừ file SA_DESIGN vừa tạo chưa commit ở bước cuối nếu theo thứ tự)
- [ ] Sau bước 6: `git status` hoàn toàn sạch
- [ ] Branch đúng `feature/master-plan-project-lookup`
- [ ] 3 commit theo đúng thứ tự BA_SPEC → prompts → SA_DESIGN
- [ ] SA_DESIGN có đủ 12 mục theo sa-rules.md
- [ ] Không có push nào lên remote
- [ ] Không có file code `.ts` nào được tạo

**Bắt đầu từ Bước 1.**
