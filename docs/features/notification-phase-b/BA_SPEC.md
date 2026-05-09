# BA Spec — Notification Phase B (Recipient Resolution)

**Phiên bản:** 1.0 · **Ngày:** 2026-05-09 · **Tác giả:** Tech Advisor (Claude Opus)
**Phê duyệt:** SH (Digital Transfer Director)
**Phạm vi:** Resolve `recipientIds` cho 3 phương thức trong `NotificationService` (file `wms-backend/src/common/notifications/notification.service.ts`)

> **Phạm vi hẹp:** Chỉ giải quyết 3 TODO về `recipientIds = []`. Phần dispatch thật (email/SSE/FCM) ở dòng 38-42 là backlog ticket riêng `NOTIFICATION-DISPATCH-MULTI-CHANNEL` — không thuộc Phase B này.

---

## 1. Bối cảnh

Hiện tại `NotificationService` ở `Phase A`: **log-only stub**. Khi sự cố (`Incident`) phát sinh, hệ thống gọi 3 phương thức:

| Phương thức | Sự kiện | Thiếu recipient | Hậu quả hiện tại |
|------------|--------|-----------------|--------------------|
| `notifyIncidentCreated` | Incident mới được tạo | QLDA + HO của project | **Silent failure** — log "recipients: 0" nhưng không gửi cho ai |
| `notifyIncidentResolved` | Kỹ thuật báo xong, chờ verify | QLDA của project | **Silent failure** |
| `notifyReopenRequested` | User yêu cầu reopen Incident | Người có privilege `APPROVE_INCIDENT_REOPEN` | **Silent failure** |

**Tác động:**
- QLDA không được báo khi có sự cố → phản ứng trễ
- HO (cấp quản lý cao hơn) không thấy Incident nghiêm trọng → mất visibility
- Reopen request không được duyệt → user không biết phải làm gì → bottleneck

## 2. Business Rules

### BR-NPB-01 — QLDA của project

**Định nghĩa "QLDA":** Tất cả `Employee` được assign vai `PROJECT_MANAGER` cho project cụ thể qua bảng `project_assignments`.

**Logic resolution:**

```
GIVEN project_id của Incident
WHEN resolve QLDA
THEN trả về tất cả user_id thỏa mãn:
  - JOIN project_assignments PA ON PA.project_id = :project_id
  - JOIN PA.role = 'PROJECT_MANAGER'
  - JOIN employees E ON E.id = PA.employee_id
  - JOIN users U ON U.employee_id = E.id
  - LỌC PA.deleted_at IS NULL (active assignment)
  - LỌC U.is_active = true (account còn hoạt động)
```

**Edge case:**
- Nếu project không có QLDA nào → log WARNING, không throw error, gửi notification tới HO thay thế (xem BR-NPB-02). Tạo audit log entry `INCIDENT_NO_QLDA_FALLBACK_HO`.
- Nếu project có nhiều QLDA (đồng QLDA) → gửi cho TẤT CẢ.

### BR-NPB-02 — HO của project

**Định nghĩa "HO" (Head Office):** Tất cả `Employee` thuộc `Organization` có `org_type = HEAD_OFFICE` **và** đồng thời ở organization tổ tiên (parent chain) của project's organization.

**Logic resolution:**

```
GIVEN project_id của Incident
WHEN resolve HO
THEN:
  1. Lấy organization_id của project (P)
  2. Đệ quy ngược lên parent chain của P qua organizations.parent_id
  3. Lọc các organization tổ tiên có org_type = 'HEAD_OFFICE'
  4. JOIN employees thuộc các org đó (employees.department_id IN ancestors)
  5. JOIN users U ON U.employee_id = E.id
  6. LỌC U.is_active = true
  7. UNIQUE user_id (1 user có thể thuộc nhiều org chain)
```

**Lý do dùng parent chain:** SH-GROUP có cấu trúc đa cấp (Root → Subsidiary → IMPC Department → Site). HO nên là cấp tổng hơn cấp project, không phải mọi HO toàn hệ thống.

**Edge case:**
- Nếu chain không có org `HEAD_OFFICE` nào → log WARNING, fallback chỉ gửi cho QLDA (BR-NPB-01).
- Để tránh notification flood, **giới hạn tối đa 5 HO per notification** — nếu nhiều hơn, lấy 5 HO ở org tổ tiên gần nhất (closest first).

### BR-NPB-03 — APPROVE_INCIDENT_REOPEN privilege holders

**Định nghĩa:** Tất cả user có privilege code `APPROVE_INCIDENT_REOPEN` qua chain:

```
users → user_roles → roles → role_privileges → privileges
```

**Logic resolution:**

```
GIVEN incident_id (không cần project context)
WHEN resolve approvers
THEN trả về user_ids:
  - JOIN users U
  - JOIN user_roles UR ON UR.user_id = U.id
  - JOIN role_privileges RP ON RP.role_id = UR.role_id
  - JOIN privileges P ON P.id = RP.privilege_id
  - WHERE P.code = 'APPROVE_INCIDENT_REOPEN'
  - AND U.is_active = true
  - AND UR.deleted_at IS NULL
  - UNIQUE user_id
```

**Edge case:**
- Nếu privilege chưa được seed → seed vào `SeedService` (xem §5)
- Nếu không có user nào có privilege này → log ERROR, alert SH (đây là cấu hình hệ thống sai)
- Giới hạn **tối đa 10 approvers** để tránh flood; nếu nhiều hơn, lấy theo `role.priority` cao trước.

---

## 3. Acceptance Criteria

### AC-1: `notifyIncidentCreated`

- [ ] Khi tạo Incident với `severity = NORMAL` → gửi tới QLDA của project
- [ ] Khi tạo Incident với `severity = CRITICAL` → gửi tới QLDA + tối đa 5 HO của project chain
- [ ] Nếu project không có QLDA active → fallback gửi HO + log `INCIDENT_NO_QLDA_FALLBACK_HO`
- [ ] Nếu cả QLDA + HO đều rỗng → log ERROR + tạo entry trong `audit_logs` với reason `INCIDENT_NO_RECIPIENT`
- [ ] `recipientIds` không có duplicate user_id

### AC-2: `notifyIncidentResolved`

- [ ] Gửi tới TẤT CẢ QLDA của project (không bao gồm HO)
- [ ] Nếu không có QLDA → log WARNING, KHÔNG fallback HO (vì đây là verification, không cần escalate)
- [ ] `recipientIds` không có duplicate

### AC-3: `notifyReopenRequested`

- [ ] Gửi tới user có privilege `APPROVE_INCIDENT_REOPEN` (toàn hệ thống, không filter theo project)
- [ ] Tối đa 10 user, ưu tiên role có priority cao
- [ ] Nếu không có user nào → log ERROR + audit log `REOPEN_NO_APPROVER` + alert SH

### AC-4: Performance

- [ ] Resolution time < 200ms cho project có ≤100 employees
- [ ] Sử dụng index có sẵn trên `project_assignments.project_id`, `users.employee_id`, `role_privileges.role_id`
- [ ] Cache resolution kết quả trong 60 giây (TTL Redis) — invalidate khi `project_assignments` hoặc `user_roles` thay đổi

### AC-5: Audit & Observability

- [ ] Mỗi lần resolve trả 0 recipient → log WARNING với context (project_id, method)
- [ ] Mỗi lần fallback (QLDA → HO) → ghi audit log
- [ ] Metric `notification.recipient_resolved_count` ghi nhận số recipient cho mỗi event (cho monitoring sau)

---

## 4. Privilege bổ sung cần seed

Nếu chưa có, thêm vào `SeedService.privilegesData`:

```typescript
{
  code: 'APPROVE_INCIDENT_REOPEN',
  name: 'Duyệt yêu cầu mở lại sự cố',
  module: 'PROJECT_MANAGEMENT',
},
```

Gán privilege này cho role `PROJECT_MANAGER` và `SUPER_ADMIN` qua `RolePrivilege`.

---

## 5. Out of Scope (defer backlog)

| Item | Backlog ticket |
|------|----------------|
| Dispatch thật (email qua MailService, web qua SSE, push qua FCM) — TODO line 38-42 trong notification.service.ts | `NOTIFICATION-DISPATCH-MULTI-CHANNEL` |
| Email template với i18n VN | `NOTIFICATION-EMAIL-TEMPLATE-VN` |
| User notification preferences (opt-out per event type) | `NOTIFICATION-USER-PREFERENCES` |
| Rate limiting per recipient (max 10 noti/hour) | `NOTIFICATION-RATE-LIMIT-PER-USER` |
| Digest mode (gộp nhiều noti trong 15 phút thành 1) | `NOTIFICATION-DIGEST-MODE` |

---

## 6. Risk & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Resolution query chậm khi có nhiều QLDA/HO | Medium | Low | Cache 60s + index có sẵn |
| Notification spam khi project có nhiều QLDA (>20 người) | Low | Medium | Rule giới hạn 5 HO + audit |
| Privilege `APPROVE_INCIDENT_REOPEN` chưa seed → ERROR khi reopen | High lúc deploy | Medium | Migration thêm privilege + seed mặc định cho SUPER_ADMIN |
| Org parent chain chứa cycle (data corruption) | Very low | High | Limit recursion depth = 10 trong query |

---

## 7. Test cases (cho QA)

| ID | Scenario | Expected |
|----|----------|----------|
| TC-NPB-01 | Tạo Incident `NORMAL` cho project có 2 QLDA | recipientIds = 2 user_ids của 2 QLDA |
| TC-NPB-02 | Tạo Incident `CRITICAL` cho project ở SITE-VCQ7 | recipientIds = QLDA(s) + HO(s) (≤5) |
| TC-NPB-03 | Tạo Incident cho project không có QLDA | Fallback HO; audit log `INCIDENT_NO_QLDA_FALLBACK_HO` |
| TC-NPB-04 | Tạo Incident cho project không có QLDA và không có HO | recipientIds=[]; audit log `INCIDENT_NO_RECIPIENT`; ERROR log |
| TC-NPB-05 | Resolve Incident → notify QLDA only | KHÔNG có HO trong recipientIds |
| TC-NPB-06 | Reopen request | Tất cả user có privilege `APPROVE_INCIDENT_REOPEN`, max 10 |
| TC-NPB-07 | Resolve khi chưa seed privilege `APPROVE_INCIDENT_REOPEN` | ERROR log + alert; recipientIds=[] |
| TC-NPB-08 | Performance: resolve QLDA cho project có 100 employees | < 200ms |
| TC-NPB-09 | Cache hit: gọi resolve 2 lần liên tiếp trong 60s | Lần 2 lấy từ Redis cache, < 50ms |
| TC-NPB-10 | Cache invalidate: thêm 1 QLDA mới vào project_assignments | Lần resolve tiếp theo lấy thông tin mới |

---

## 8. Câu hỏi mở (cần SH xác nhận khi rảnh)

1. **HO definition:** Em giả định HO = `org_type = 'HEAD_OFFICE'` trong parent chain. Anh có muốn đổi thành role-based (vd `HO_MANAGER` role)? **Default: dùng định nghĩa của em**, anh sửa nếu khác.

2. **HO limit:** Em chốt max 5 HO. Anh có muốn cấu hình qua env (`MAX_HO_RECIPIENTS_PER_INCIDENT`)? **Default: hardcode 5**, có thể configurable sau.

3. **APPROVE_INCIDENT_REOPEN priority limit:** Em chốt max 10. Anh có muốn cấu hình? **Default: hardcode 10**.

→ Nếu anh không phản hồi, em apply Default → CC CLI implement theo. Em ghi vào `Risk Register R-017` để revisit nếu sau này có pushback.

---

**Lịch sử phiên bản:**

| Phiên bản | Ngày | Tác giả | Nội dung |
|-----------|------|---------|----------|
| 1.0 | 2026-05-09 | Tech Advisor (Claude Opus) | Phát hành lần đầu |
