# Master Plan — Deploy Checklist (Neon Production)

> Áp dụng cho 10 migration `1776300000000-09` (Phase A Master Plan). Bổ sung `10-12` sau khi supplement Gate 4 DONE.

## 0. Tiền điều kiện

- [ ] User đã backup Neon snapshot gần nhất (Neon UI → Branches → create branch from prod).
- [ ] `DATABASE_URL` trong `.env` local đang trỏ về Neon production (hoặc chạy trực tiếp từ Render shell).
- [ ] Redis `REDIS_URL` (Upstash) đã bật — không cần cho schema, chỉ cần khi test cron sau deploy.
- [ ] Đã merge commit `7a05258` (supplement docs) xuống branch deploy. `git status` clean.

## 1. Dry-run schema compile

```bash
cd wms-backend
npm run build                             # Compile dist/ — bắt buộc trước migration
npm run migration:show                    # Liệt kê migration pending (kỳ vọng 10 dòng [ ])
```

Kỳ vọng output:
```
[ ] MasterPlanSchema1776300000000
[ ] MasterPlanPrivilegesSeed1776300000001
[ ] ChecklistSchema1776300000002
[ ] ChecklistPrivilegesSeed1776300000003
[ ] IncidentSchema1776300000004
[ ] IncidentPrivilegesSeed1776300000005
[ ] OfficeTaskSchema1776300000006
[ ] OfficeTaskPrivilegesSeed1776300000007
[ ] EnergyInspectionSchema1776300000008
[ ] EnergyPrivilegesSeed1776300000009
```

Nếu dòng nào không `[ ]` → **DỪNG**, kiểm tra lý do (có thể đã chạy nhầm trên branch khác).

## 2. Apply migrations

```bash
npm run migration:run                     # TypeORM áp tuần tự 10 migration
```

Trong lúc chạy, log tối thiểu phải có:
- `query: CREATE TYPE "master_plan_status" …`
- `query: CREATE TABLE "master_plans" …`
- `query: INSERT INTO "privileges" ("code","name",…)` × 5 lần (MP) + × 2 (CHK) + × 8 (INC) + × 2 (OT) + × 3 (ENR) = **20 privilege row mới**.

Nếu lỗi FK hay constraint → **ROLLBACK ngay:**
```bash
npm run migration:revert                  # Revert TỪNG migration một; lặp 10 lần
```

## 3. Verify state sau migration

```sql
-- Chạy trên Neon SQL editor hoặc psql
SELECT COUNT(*) AS privileges_new
  FROM privileges
 WHERE module IN ('MASTER_PLAN','CHECKLIST','INCIDENT','OFFICE_TASK','ENERGY');
-- Kỳ vọng: 20

SELECT table_name FROM information_schema.tables
 WHERE table_schema='public'
   AND table_name IN (
     'master_plans','wbs_nodes','task_templates','work_items',
     'checklist_templates','checklist_template_items','checklist_instances','checklist_item_results',
     'incidents','incident_photos','incident_comments',
     'incident_reopen_requests','incident_assignee_change_requests',
     'office_tasks','office_task_items',
     'energy_meters','energy_inspections','energy_readings'
   )
 ORDER BY table_name;
-- Kỳ vọng: 18 bảng
```

## 4. Seed privilege cho SUPER_ADMIN

Khi migration seed tạo privilege mới, **KHÔNG tự gán** vào role nào. Cần gán tay hoặc chạy seed role:

```sql
INSERT INTO role_privileges (role_id, privilege_id)
SELECT r.id, p.id
  FROM roles r
 CROSS JOIN privileges p
 WHERE r.code = 'SUPER_ADMIN'
   AND p.module IN ('MASTER_PLAN','CHECKLIST','INCIDENT','OFFICE_TASK','ENERGY')
   AND NOT EXISTS (
     SELECT 1 FROM role_privileges rp
      WHERE rp.role_id = r.id AND rp.privilege_id = p.id
   );
```

## 5. Smoke test 1 kịch bản E2E

Bước thao tác (dùng Swagger UI `/api` hoặc Postman):

1. `POST /auth/login` → token SUPER_ADMIN.
2. `POST /master-plan` body `{ code:"MP-TEST-2026", name:"Test plan", year:2026, project_id:<id>, budget_vnd:"10000000", start_date:"2026-01-01", end_date:"2026-12-31" }` → 201, status DRAFT.
3. `POST /master-plan/:planId/wbs-nodes` root level 1, budget 5M.
4. `POST /master-plan/:planId/wbs-nodes` con level 2, node_type TASK_TEMPLATE, `responsible_employee_id=<emp>`.
5. `POST /master-plan/:planId/wbs-nodes/:leafId/task-templates` body work_item_type CHECKLIST, `template_ref_id=<ChecklistTemplate>`, rrule `FREQ=DAILY`.
6. `POST /master-plan/:planId/approve` → status ACTIVE (BR-MP-04 budget roll-up PASS).
7. `POST /master-plan/admin/trigger-daily-scan` → job enqueue.
8. Đợi 5-10s → `GET /work-items?plan_id=:planId` → kỳ vọng có ChecklistInstance mới sinh.

## 6. Rollback plan

- Mỗi migration có hàm `down()` drop cột/bảng đã tạo. Có thể revert từng cái qua `npm run migration:revert`.
- Nếu đã có data production (plan thật) → **không** revert migration schema, mà patch forward qua migration mới.
- Nếu cron làm ầm production → `RECURRENCE_CRON_ENABLED=false` trên Render env + redeploy (không cần migration).

## 7. Post-deploy verify

- [ ] Render backend health `/health` 200.
- [ ] Vercel frontend load trang `/master-plan` không lỗi 500.
- [ ] Kiểm tra Neon connection pool vẫn thấp (< 30% capacity).
- [ ] `SELECT version FROM typeorm_migrations ORDER BY timestamp DESC LIMIT 10` — kỳ vọng có 10 entry mới nhất.

## 8. Known issues

- **Cloudinary free tier** chặn PDF/ZIP delivery → 401 khi fetch photo từ Incident export. Fix dashboard Cloudinary Settings → Security → uncheck "Restrict PDF/ZIP".
- Migration `1776300000002-ChecklistSchema` tạo type `photo_category` được reuse trong IncidentSchema. Không chạy migration IncidentSchema nếu Checklist chưa chạy.

## 9. Hand-off

User chạy bước 1-2 trên local shell pointing to Neon, hoặc SSH vào Render instance chạy `npm run migration:run`. Sau khi DONE, báo lại để tôi verify state bước 3-4.
