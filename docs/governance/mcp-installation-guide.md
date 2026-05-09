# MCP Installation Guide — Neon + GitHub for SHERP

**Phiên bản:** 1.0 · **Ngày:** 2026-05-09 · **Tác giả:** Tech Advisor (Claude Opus)
**Đối tượng:** SH (Digital Transfer Director) thực hiện cài đặt
**Thời gian thực hiện:** ~10 phút

> **Mục đích:** Hướng dẫn từng bước cài 2 MCP server cho dự án SHERP để tăng năng lực Tech Advisor + IT Audit Agent.
>
> **Ưu tiên bảo mật:** Mỗi MCP cấu hình theo nguyên tắc **least privilege** — quyền đọc trước, quyền viết chỉ khi cần thiết.

---

## 1. Tổng quan

```mermaid
flowchart TB
    SH["<b>SH (Cowork user)</b>"] --> Settings["<b>Cowork Settings</b><br/>━━━━━<br/>Capabilities tab"]
    Settings --> M1["<b>Add Neon MCP</b><br/>━━━━━<br/>Read-only role<br/>Connection string"]
    Settings --> M2["<b>Add GitHub MCP</b><br/>━━━━━<br/>Personal Access Token<br/>Scoped permissions"]

    M1 --> TA["<b>Tech Advisor</b><br/>(Cowork session)"]
    M2 --> TA
    M1 --> ITA["<b>IT Audit Agent</b><br/>(Claude.ai session)"]
    M2 --> ITA

    TA --> Use1["<b>Query DB trực tiếp</b><br/>Verify migration<br/>Check audit logs"]
    TA --> Use2["<b>Read PR status</b><br/>CI logs<br/>Issue tracking"]
    ITA --> Use3["<b>Independent verification</b><br/>Control evidence"]

    style SH fill:#fef3c7,color:#000,stroke:#92400e,stroke-width:3px
    style Settings fill:#dbeafe,color:#000,stroke:#1e3a8a,stroke-width:3px
    style M1 fill:#dcfce7,color:#000,stroke:#14532d,stroke-width:3px
    style M2 fill:#dcfce7,color:#000,stroke:#14532d,stroke-width:3px
    style TA fill:#fce7f3,color:#000,stroke:#831843,stroke-width:2px
    style ITA fill:#fce7f3,color:#000,stroke:#831843,stroke-width:2px
```

---

## 2. Phần A — Cài Neon MCP (5 phút)

### A.1. Tạo read-only role trên Neon

1. Đăng nhập **https://console.neon.tech** với account của anh
2. Chọn project SHERP (hoặc tên project tương ứng)
3. Click **"Roles"** ở sidebar trái
4. Click nút **"+ New Role"**
5. Đặt name: `ai_readonly`
6. Bấm **"Create"**

### A.2. Cấp quyền `SELECT` only cho role mới

Mở **SQL Editor** (ở sidebar Neon), chạy:

```sql
-- Cấp quyền SELECT cho mọi schema hiện tại
GRANT USAGE ON SCHEMA public TO ai_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO ai_readonly;

-- Default cho table tạo trong tương lai
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO ai_readonly;

-- KHÔNG cấp INSERT/UPDATE/DELETE/DROP
-- KHÔNG cấp quyền cho schema khác (vd auth, neon_internal)

-- Verify quyền
SELECT
  grantee,
  table_schema,
  table_name,
  privilege_type
FROM information_schema.table_privileges
WHERE grantee = 'ai_readonly'
LIMIT 20;
```

Kết quả phải thấy chỉ có `SELECT` privilege.

### A.3. Lấy connection string của role mới

Vẫn ở Neon Console:

1. Click **"Connection Details"** sidebar
2. Dropdown **"Role"** → chọn **`ai_readonly`** (vừa tạo)
3. Dropdown **"Database"** → chọn database SHERP
4. Copy **Connection string** (dạng `postgresql://ai_readonly:xxxx@ep-xxx.us-east-2.aws.neon.tech/sherp?sslmode=require`)

**LƯU Ý:** Connection string này chứa password — KHÔNG paste vào git, slack, email công khai.

### A.4. Cài Neon MCP qua Cowork settings

1. Trong Cowork app, click avatar góc trên phải → **Settings**
2. Tab **Capabilities** (hoặc **MCP Servers**)
3. Tìm section **"Add MCP Server"** → click **"+ Add"**
4. Chọn type: **"PostgreSQL"** hoặc **"Neon"** (tùy Cowork UI version)
5. Điền:
   - **Name:** `Neon SHERP (read-only)`
   - **Connection String:** paste cái lấy từ A.3
   - **Description (optional):** `Read-only access to SHERP production DB for audit + verification`
6. Click **"Save"** hoặc **"Connect"**
7. Cowork sẽ test connection — phải thấy ✅ Connected

### A.5. Test với Tech Advisor

Quay lại session Cowork đang nói chuyện với Tech Advisor (session này), ngắt kết nối + reconnect (refresh browser hoặc restart Cowork app) để load MCP mới.

Sau đó anh hỏi em:
> "Em query xem có bao nhiêu projects trong DB?"

Em sẽ chạy query qua MCP và trả lời.

---

## 3. Phần B — Cài GitHub MCP (5 phút)

### B.1. Tạo Personal Access Token (PAT) với scope hạn chế

1. Đăng nhập **https://github.com** với account `DuyNguyenbhsh`
2. Click avatar → **Settings** → **Developer settings** (cuối sidebar trái) → **Personal access tokens** → **Fine-grained tokens**
3. Click **"Generate new token"**
4. Điền:
   - **Token name:** `SHERP MCP - Tech Advisor + IT Audit`
   - **Expiration:** 90 days (rotate định kỳ — security best practice)
   - **Repository access:** **"Only select repositories"** → chọn `DuyNguyenbhsh/SHERP`
5. **Repository permissions** — chọn tối thiểu:

| Permission | Quyền | Lý do |
|------------|-------|-------|
| **Contents** | Read-only | Đọc code, commit, blob |
| **Issues** | Read and write | Tạo backlog ticket khi audit phát hiện |
| **Pull requests** | Read and write | Đọc PR, comment review feedback |
| **Metadata** | Read-only (mặc định) | Repo info |
| **Actions** | Read-only | Đọc CI status, log |
| **Commit statuses** | Read-only | Đọc check status (3/5 passed, etc.) |

**KHÔNG cấp:**
- Administration (delete repo, change settings)
- Secrets (read/write GitHub Actions secrets)
- Workflows (modify .github/workflows files)
- Webhooks

6. Click **"Generate token"**
7. Copy token ngay (GitHub chỉ hiện 1 lần) — lưu tạm vào notepad

### B.2. Cài GitHub MCP qua Cowork settings

1. Cowork **Settings** → **Capabilities** → **+ Add MCP Server**
2. Chọn type: **"GitHub"**
3. Điền:
   - **Name:** `GitHub SHERP`
   - **Token:** paste PAT từ B.1
   - **Default repo (optional):** `DuyNguyenbhsh/SHERP`
4. Click **"Save"**
5. Test connection — phải thấy ✅ Connected

### B.3. Test với Tech Advisor

Refresh Cowork app, hỏi em:
> "Em check xem PR #2 có check nào fail không?"

Em sẽ query qua MCP, trả lời cụ thể.

---

## 4. Lưu trữ + xoay vòng credentials

### 4.1. Đăng ký vào Risk Register

Sau khi cài xong, em (Tech Advisor) sẽ thêm vào `docs/governance/risk-register.md`:

```markdown
### R-016 · MCP credentials không có chính sách xoay vòng

| | |
|--|--|
| **Domain** | 5 |
| **Description** | 2 MCP credential mới (Neon ai_readonly + GitHub PAT) cấp cho phiên Tech Advisor + IT Audit. Nếu lộ → AI có thể đọc DB hoặc repo SHERP qua bên thứ 3. |
| **Likelihood** | 2 |
| **Impact** | 3 |
| **Score** | 6 |
| **Severity** | Low |
| **Mitigation** | (1) GitHub PAT expire sau 90 ngày — buộc rotate. (2) Neon role `ai_readonly` chỉ SELECT — không thể destructive. (3) Audit access log Neon hàng quý. (4) Khi rotate, revoke old credential ngay. |
| **Status** | Open (sẽ → Mitigated khi quy trình rotate được document) |
```

### 4.2. Lịch xoay vòng

| Credential | Tần suất | Reminder |
|-----------|----------|----------|
| GitHub PAT | 90 ngày (tự expire) | GitHub email reminder 7 ngày trước expire |
| Neon `ai_readonly` password | 6 tháng | Set calendar reminder thủ công |

---

## 5. Sau khi cài xong, năng lực mới

### 5.1. Tech Advisor (em) làm được gì mới

| Trước | Sau |
|-------|-----|
| Phải đợi anh paste screenshot DB | Em query trực tiếp `SELECT count(*) FROM projects WHERE organization_id = ...` |
| Phải đợi anh paste git log | Em đọc `git log` qua GitHub API |
| Không thấy CI status | Em đọc check_runs API → diagnose sao 2/5 checks fail |
| Không track được issue | Em tạo + comment issue cho action items |

### 5.2. IT Audit Agent (phiên claude.ai) làm được gì mới

| Trước | Sau |
|-------|-----|
| Audit dựa trên file paste — bằng chứng gián tiếp | Verify trực tiếp DB state khi audit (vd "audit_logs có entry cross-org không?") |
| Không thấy PR review state | Đọc PR comments, approval state, conversation history |

→ **IT Audit Agent cần MCP riêng** vì là phiên claude.ai khác. Anh cũng setup cho phiên đó tương tự (cùng credentials hoặc credentials riêng nếu Cowork web hỗ trợ multi-MCP-per-session).

---

## 6. Troubleshooting

### Lỗi "Connection refused" khi test Neon MCP

- Verify connection string có `?sslmode=require` ở cuối
- Verify Neon project không bị suspend (free tier auto-suspend sau 5 phút inactive)
- Test bằng `psql` từ máy local trước khi cài MCP

### Lỗi "401 Unauthorized" khi test GitHub MCP

- Verify PAT chưa expire (xem expiration date trong GitHub settings)
- Verify repo `DuyNguyenbhsh/SHERP` có trong "Selected repositories"
- Verify permissions ≥ Read cho Contents

### Cowork app không thấy section "Add MCP Server"

- Check Cowork version — cần version mới hỗ trợ MCP
- Update Cowork: từ menu File → Check for Updates
- Nếu vẫn không có → liên hệ Anthropic support hoặc đợi tính năng được rollout

---

## 7. Sau khi cài thành công, báo em

Anh paste 1 dòng:

```
Đã cài xong Neon MCP + GitHub MCP. Refresh Cowork session.
```

Em sẽ chạy 2 query test ngay để verify:
1. `SELECT count(*) FROM projects` (test Neon)
2. Đọc PR #2 status (test GitHub)

Nếu cả 2 hoạt động → R-016 status sẽ chuyển `Open → Mitigated`. Em cập nhật Risk Register.

---

**Lịch sử phiên bản:**

| Phiên bản | Ngày | Tác giả | Nội dung |
|-----------|------|---------|----------|
| 1.0 | 2026-05-09 | Tech Advisor (Claude Opus) | Phát hành lần đầu |
