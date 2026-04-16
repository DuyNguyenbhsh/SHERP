# SH-GROUP ERP -- Database Entity Relationship Diagram

> **Muc dich:** The hien toan bo cau truc database cua he thong SH-GROUP ERP, bao gom cac entities, 
> relationships va nhom theo domain nghiep vu. Diagram nay duoc tao tu **69 entity files** thuc te 
> trong `wms-backend/src/`.
>
> **Quy uoc doc:**
> - `PK` = Primary Key (UUID)
> - `FK` = Foreign Key
> - `||--o{` = One-to-Many
> - `||--||` = One-to-One
> - `}o--o{` = Many-to-Many (thong qua bang trung gian)
>
> **Oracle Standard:** Project -> Contract -> Budget -> WBS -> Transactions -> Cost Categories

---

## Complete ERD

```mermaid
erDiagram

    %% ================================================================
    %% DOMAIN 1: FOUNDATION (Users, Roles, Organizations, Employees)
    %% ================================================================

    users {
        uuid id PK
        string username UK
        string password_hash
        boolean is_active
        uuid employee_id FK
    }

    roles {
        uuid id PK
        string role_code UK
        string role_name
        boolean is_active
    }

    privileges {
        uuid id PK
        string privilege_code UK
        string privilege_name
        string module
    }

    user_roles {
        uuid id PK
        uuid user_id FK
        uuid role_id FK
        uuid organization_id FK
    }

    role_privileges {
        uuid id PK
        uuid role_id FK
        uuid privilege_id FK
    }

    employees {
        uuid id PK
        string employee_code UK
        string full_name
        string status
        uuid department_id FK
        uuid position_id FK
        uuid manager_id FK
    }

    organizations {
        uuid id PK
        string organization_code UK
        string organization_name
        string org_type
        string cost_center_code
        uuid parent_id FK
        boolean is_active
    }

    positions {
        uuid id PK
        string position_code UK
        string position_name
        string scope
        uuid default_role_id FK
    }

    %% -- Foundation Relationships --
    users ||--|| employees : "employee_id"
    users ||--o{ user_roles : "user_id"
    user_roles }o--|| roles : "role_id"
    user_roles }o--|| organizations : "organization_id"
    roles ||--o{ role_privileges : "role_id"
    role_privileges }o--|| privileges : "privilege_id"
    employees }o--|| organizations : "department_id"
    employees }o--|| positions : "position_id"
    employees }o--|| employees : "manager_id (self)"
    organizations }o--|| organizations : "parent_id (self)"
    positions }o--|| roles : "default_role_id"

    %% ================================================================
    %% DOMAIN 2: AUTH & SECURITY
    %% ================================================================

    auth_logs {
        uuid id PK
        uuid user_id FK
        string event
        string ip_address
    }

    refresh_tokens {
        uuid id PK
        uuid user_id FK
        string token_hash
        timestamp expires_at
        boolean is_revoked
    }

    password_reset_tokens {
        uuid id PK
        uuid user_id FK
        string token_hash
        timestamp expires_at
        boolean is_used
    }

    users ||--o{ auth_logs : "user_id"
    users ||--o{ refresh_tokens : "user_id"
    users ||--o{ password_reset_tokens : "user_id"

    %% ================================================================
    %% DOMAIN 3: PROJECTS (Oracle Standard Chain)
    %% Project -> Contract -> Budget -> WBS -> Transactions -> Cost Categories
    %% ================================================================

    projects {
        uuid id PK
        string project_code UK
        string project_name
        string project_type
        string stage
        string status
        decimal budget
        string contract_number
        decimal contract_value
        date contract_date
        uuid organization_id FK
        uuid investor_id FK
        uuid manager_id FK
        uuid department_id FK
    }

    cost_categories {
        uuid id PK
        string code UK
        string name
    }

    project_budgets {
        uuid id PK
        uuid project_id FK
        uuid category_id FK
        string budget_code UK
        string budget_type
        string control_level
        string status
        decimal planned_amount
        string currency
        int fiscal_year
        uuid wbs_element_id FK
    }

    budget_periods {
        uuid id PK
        uuid budget_id FK
        string period_name
        decimal period_amount
        decimal consumed_amount
        decimal committed_amount
    }

    budget_revisions {
        uuid id PK
        uuid budget_id FK
        int revision_number
        decimal previous_amount
        decimal revised_amount
        string status
    }

    budget_transaction_logs {
        uuid id PK
        uuid budget_id FK
        uuid budget_period_id FK
        string transaction_type
        decimal amount
        string amount_type
        string check_result
        decimal available_before
        decimal available_after
    }

    project_wbs {
        uuid id PK
        uuid project_id FK
        uuid parent_id FK
        string code
        string name
        int level
        string path
        decimal weight
        decimal progress_percent
        string status
    }

    project_cbs {
        uuid id PK
        uuid project_id FK
        uuid wbs_id FK
        uuid category_id FK
        decimal planned_amount
        string currency
    }

    project_transactions {
        uuid id PK
        uuid project_id FK
        uuid category_id FK
        uuid wbs_id FK
        string reference_type
        string reference_id
        decimal amount
        date transaction_date
    }

    project_boq_items {
        uuid id PK
        uuid project_id FK
        uuid wbs_id FK
        uuid category_id FK
        string item_code
        string item_name
        decimal quantity
        decimal unit_price
        decimal total_price
        decimal issued_qty
    }

    project_boq_imports {
        uuid id PK
        uuid project_id FK
        string file_name
        int total_rows
        int success_rows
        int error_rows
    }

    project_settlements {
        uuid id PK
        uuid project_id FK
        string status
        decimal total_material_in
        decimal total_material_out
        decimal variance
    }

    project_settlement_lines {
        uuid id PK
        uuid settlement_id FK
        uuid product_id FK
        decimal qty_issued
        decimal qty_returned
        decimal qty_variance
        decimal value_variance
    }

    non_conformance_reports {
        uuid id PK
        string ncr_code UK
        uuid project_id FK
        string category
        string severity
        string status
        decimal penalty_amount
        uuid assigned_to FK
    }

    ncr_attachments {
        uuid id PK
        uuid ncr_id FK
        string phase
        string file_url
    }

    project_assignments {
        uuid id PK
        uuid project_id FK
        uuid employee_id FK
        string role
        boolean is_active
    }

    project_history {
        uuid id PK
        uuid project_id FK
        string field_name
        string old_value
        string new_value
        string changed_by
    }

    subcontractor_kpis {
        uuid id PK
        uuid supplier_id FK
        uuid project_id FK
        date evaluation_date
        decimal total_score
        string result
    }

    work_item_masters {
        uuid id PK
        string item_code UK
        string item_name
        string unit
        boolean is_active
    }

    %% -- Oracle Standard Chain: Project -> Contract -> Budget -> WBS -> Transactions -> CostCategory --
    projects ||--o{ project_budgets : "project_id"
    projects ||--o{ project_wbs : "project_id"
    projects ||--o{ project_transactions : "project_id"
    projects ||--o{ project_boq_items : "project_id"
    projects ||--o{ project_boq_imports : "project_id"
    projects ||--o{ project_settlements : "project_id"
    projects ||--o{ non_conformance_reports : "project_id"
    projects ||--o{ project_assignments : "project_id"
    projects ||--o{ project_history : "project_id"
    projects ||--o{ project_cbs : "project_id"
    projects }o--|| organizations : "organization_id"
    projects }o--|| suppliers : "investor_id"
    projects }o--|| employees : "manager_id"
    projects }o--|| organizations : "department_id"

    project_budgets }o--|| cost_categories : "category_id"
    project_budgets ||--o{ budget_periods : "budget_id"
    project_budgets ||--o{ budget_revisions : "budget_id"
    project_budgets ||--o{ budget_transaction_logs : "budget_id"
    budget_transaction_logs }o--|| budget_periods : "budget_period_id"

    project_wbs }o--|| project_wbs : "parent_id (self)"
    project_cbs }o--|| project_wbs : "wbs_id"
    project_cbs }o--|| cost_categories : "category_id"

    project_transactions }o--|| cost_categories : "category_id"

    project_boq_items }o--|| project_wbs : "wbs_id"
    project_boq_items }o--|| cost_categories : "category_id"

    project_settlements ||--o{ project_settlement_lines : "settlement_id"

    non_conformance_reports ||--o{ ncr_attachments : "ncr_id"
    non_conformance_reports }o--|| employees : "assigned_to"

    project_assignments }o--|| employees : "employee_id"

    subcontractor_kpis }o--|| suppliers : "supplier_id"
    subcontractor_kpis }o--|| projects : "project_id"

    %% ================================================================
    %% DOMAIN 4: PROJECT MONITORING & SCHEDULING
    %% ================================================================

    project_progress_reports {
        uuid id PK
        uuid project_id FK
        string report_period
        date report_date
        decimal overall_progress
        decimal earned_value
        decimal actual_cost
        decimal planned_value
        decimal spi
        decimal cpi
        string status
    }

    variation_orders {
        uuid id PK
        uuid project_id FK
        string vo_code UK
        string vo_type
        decimal budget_before
        decimal budget_after
        decimal budget_delta
        string status
    }

    project_plans {
        uuid id PK
        uuid project_id FK
        int version
        string title
        string status
        boolean is_baseline
        timestamp frozen_at
    }

    plan_approval_logs {
        uuid id PK
        uuid plan_id FK
        string from_status
        string to_status
        string action
    }

    plan_notifications {
        uuid id PK
        uuid plan_id FK
        uuid project_id FK
        uuid recipient_id FK
        string notification_type
        boolean is_read
    }

    project_requests {
        uuid id PK
        string request_code UK
        string title
        string status
        decimal budget
        uuid deployed_project_id FK
    }

    request_attachments {
        uuid id PK
        uuid request_id FK
        string file_url
        string file_name
    }

    workflow_logs {
        uuid id PK
        uuid request_id FK
        string from_status
        string to_status
        string action
    }

    project_tasks {
        uuid id PK
        uuid project_id FK
        uuid wbs_id FK
        string task_code
        string name
        int duration_days
        decimal progress_percent
        string status
        boolean is_critical
    }

    schedule_baselines {
        uuid id PK
        uuid project_id FK
        int version
        string status
        timestamp frozen_at
        jsonb snapshot_data
    }

    task_links {
        uuid id PK
        uuid project_id FK
        uuid predecessor_id FK
        uuid successor_id FK
        string link_type
        int lag_days
    }

    projects ||--o{ project_progress_reports : "project_id"
    projects ||--o{ variation_orders : "project_id"
    projects ||--o{ project_tasks : "project_id"
    projects ||--o{ schedule_baselines : "project_id"
    projects ||--o{ task_links : "project_id"

    project_plans ||--o{ plan_approval_logs : "plan_id"
    project_plans ||--o{ plan_notifications : "plan_id"

    project_requests ||--o{ workflow_logs : "request_id"
    project_requests ||--o{ request_attachments : "request_id"

    project_tasks }o--|| project_wbs : "wbs_id"
    task_links }o--|| project_tasks : "predecessor_id"
    task_links }o--|| project_tasks : "successor_id"

    %% ================================================================
    %% DOMAIN 5: WMS (Inbound, Outbound, Inventory, Locations)
    %% ================================================================

    inbound_receipts {
        uuid id PK
        string receipt_number UK
        string receipt_type
        string status
        uuid po_id FK
        uuid grn_id FK
        string warehouse_code
    }

    inbound_lines {
        uuid id PK
        uuid inbound_receipt_id FK
        uuid product_id FK
        int expected_qty
        int received_qty
        int accepted_qty
        int rejected_qty
        string qc_status
    }

    outbound_orders {
        uuid id PK
        string order_number UK
        string order_type
        string status
        uuid waybill_id FK
        uuid project_id FK
        uuid wbs_id FK
        uuid category_id FK
        decimal estimated_amount
        string warehouse_code
    }

    outbound_lines {
        uuid id PK
        uuid outbound_order_id FK
        uuid product_id FK
        int requested_qty
        int picked_qty
        int packed_qty
        string pick_status
    }

    inventory_items {
        uuid id PK
        uuid product_id FK
        uuid location_id FK
        int qty_on_hand
        int qty_reserved
        string status
        string lot_number
        string serial_number
        string warehouse_code
    }

    locations {
        uuid id PK
        string code UK
        string name
        string barcode UK
        string location_type
        string status
        uuid parent_id FK
        int max_capacity
        int current_qty
        string warehouse_code
    }

    inbound_receipts ||--o{ inbound_lines : "inbound_receipt_id"
    outbound_orders ||--o{ outbound_lines : "outbound_order_id"
    inventory_items }o--|| locations : "location_id"
    locations }o--|| locations : "parent_id (self)"

    %% ================================================================
    %% DOMAIN 6: SCM (Procurement, Suppliers, Products)
    %% ================================================================

    suppliers {
        uuid id PK
        string supplier_code UK
        string name
        string tax_code UK
        string supplier_type
        string payment_term
        decimal debt_limit
        boolean is_active
        boolean is_blacklisted
    }

    products {
        uuid id PK
        string sku UK
        string barcode UK
        string name
        string item_type
        string costing_method
        string planning_method
        decimal purchase_price
        decimal retail_price
        boolean is_active
    }

    purchase_orders {
        uuid id PK
        string po_number UK
        uuid vendor_id FK
        string status
        decimal total_amount
        uuid project_id FK
        uuid category_id FK
    }

    purchase_order_lines {
        uuid id PK
        uuid po_id FK
        uuid product_id FK
        int order_qty
        int received_qty
        decimal unit_price
    }

    goods_receipt_notes {
        uuid id PK
        string grn_number UK
        uuid po_id FK
        string received_by
    }

    goods_receipt_lines {
        uuid id PK
        uuid grn_id FK
        uuid po_line_id FK
        int received_qty
    }

    serial_numbers {
        uuid id PK
        string serial_no UK
        uuid product_id FK
        uuid grn_id FK
        string status
    }

    purchase_orders ||--o{ purchase_order_lines : "po_id"
    purchase_orders ||--o{ goods_receipt_notes : "po_id"
    purchase_orders }o--|| suppliers : "vendor_id"
    goods_receipt_notes ||--o{ goods_receipt_lines : "grn_id"
    serial_numbers }o--|| products : "product_id"
    serial_numbers }o--|| goods_receipt_notes : "grn_id"
    inbound_receipts }o--|| purchase_orders : "po_id"
    inbound_receipts }o--|| goods_receipt_notes : "grn_id"

    %% ================================================================
    %% DOMAIN 7: TMS (Waybills, Vehicles)
    %% ================================================================

    waybills {
        uuid id PK
        string waybill_code UK
        string status
        uuid vehicle_id FK
        decimal cod_amount
        string cod_status
        decimal shipping_fee
    }

    vehicles {
        uuid id PK
        string code UK
        string licensePlate
        string driverName
        string brand
        string status
    }

    waybills }o--|| vehicles : "vehicle_id"
    waybills ||--o{ outbound_orders : "waybill_id"

    %% ================================================================
    %% DOMAIN 8: SYSTEM (Audit, Settings, Documents, Approvals, Workflow)
    %% ================================================================

    audit_logs {
        uuid id PK
        string action
        string entity_name
        string entity_id
        jsonb old_data
        jsonb new_data
        string actor_id
    }

    system_settings {
        uuid id PK
        string setting_key UK
        string setting_value
        string value_type
        string category
    }

    project_folders {
        uuid id PK
        uuid project_id FK
        string folder_code
        string folder_name
    }

    project_documents {
        uuid id PK
        uuid folder_id FK
        uuid project_id FK
        string document_name
        string file_url
        string status
        date expiry_date
    }

    document_notifications {
        uuid id PK
        uuid document_id FK
        string notification_type
        boolean is_read
    }

    approval_configs {
        uuid id PK
        string entity_type
        string name
        string module_code
        boolean is_active
        jsonb conditions
    }

    approval_config_steps {
        uuid id PK
        uuid config_id FK
        int step_order
        string approver_role
        uuid approver_id FK
        boolean is_mandatory
        int timeout_hours
    }

    approval_requests {
        uuid id PK
        uuid config_id FK
        string entity_type
        uuid entity_id FK
        string status
        string requested_by
        int current_step
        jsonb request_data
    }

    approval_steps {
        uuid id PK
        uuid request_id FK
        int step_order
        uuid approver_id FK
        string status
        string comment
    }

    projects ||--o{ project_folders : "project_id"
    project_folders ||--o{ project_documents : "folder_id"
    project_documents ||--o{ document_notifications : "document_id"

    approval_configs ||--o{ approval_config_steps : "config_id"
    approval_configs ||--o{ approval_requests : "config_id"
    approval_requests ||--o{ approval_steps : "request_id"

    %% ================================================================
    %% DOMAIN 9: MASTER DATA (Reference Tables)
    %% ================================================================

    provinces {
        uuid id PK
        string code UK
        string name
    }

    communes {
        uuid id PK
        string code UK
        string name
        uuid provinceId FK
    }

    cargo_types {
        uuid id PK
        string code UK
        string name
    }

    delivery_providers {
        uuid id PK
        string code UK
        string name
        boolean isActive
    }

    delivery_types {
        uuid id PK
        string code UK
        string name
    }

    transport_routes {
        uuid id PK
        string code UK
        string name
    }

    transport_statuses {
        uuid id PK
        string code UK
        string name
    }

    provinces ||--o{ communes : "provinceId"
```

---

## Oracle Standard: Chuoi quan he chinh

```
Project (contract_number, contract_value)
    |
    |-- 1:N --> ProjectBudget (project_id, category_id, planned_amount, control_level)
    |               |
    |               |-- 1:N --> BudgetPeriod (period_amount, consumed, committed)
    |               |-- 1:N --> BudgetRevision (previous_amount, revised_amount)
    |               |-- 1:N --> BudgetTransactionLog (amount, check_result, available_before/after)
    |
    |-- 1:N --> ProjectWbs (code, level, path, weight, progress_percent)
    |               |
    |               |-- 1:N --> ProjectCbs (wbs_id + category_id --> planned_amount)
    |               |-- 1:N --> ProjectBoqItem (quantity, unit_price, total_price)
    |               |-- 1:N --> ProjectTask (duration, is_critical, CPM fields)
    |
    |-- 1:N --> ProjectTransaction (category_id, wbs_id, amount, reference_type)
    |
    |-- N:1 --> CostCategory (code: MAT, LAB, EQP, SUB, OVH)
```

**Giai thich:**
- **Project** chua thong tin hop dong (contract_number, contract_value) -- tuong duong Oracle Project Contract.
- **ProjectBudget** la ngan sach phan bo theo CostCategory, co BudgetControlLevel (HARD/SOFT) de kiem soat chi tieu.
- **ProjectWbs** la cau truc phan chia cong viec (Work Breakdown Structure) dang cay de quy.
- **ProjectCbs** la giao diem WBS x CostCategory -- ngan sach chi tiet nhat.
- **ProjectTransaction** ghi nhan moi giao dich chi phi thuc te, lien ket toi WBS va CostCategory.
- **BudgetTransactionLog** ghi nhan ket qua kiem tra ngan sach (PASS/WARN/BLOCKED) truoc moi giao dich.

---

## Thong ke Entity theo Domain

| Domain | So luong Entity | Bang chinh |
|--------|----------------|------------|
| Foundation | 5 | users, roles, employees, organizations, positions |
| Auth & Security | 3 | auth_logs, refresh_tokens, password_reset_tokens |
| RBAC (trung gian) | 2 | user_roles, role_privileges |
| Projects (Core) | 13 | projects, project_budgets, project_wbs, project_cbs, project_transactions, project_boq_items, project_settlements, ncr, project_assignments, project_history, subcontractor_kpis, cost_categories, work_item_masters |
| Projects (Budget) | 3 | budget_periods, budget_revisions, budget_transaction_logs |
| Project Monitoring | 6 | progress_reports, variation_orders, project_plans, plan_approval_logs, plan_notifications, project_requests + workflow_logs + request_attachments |
| Project Schedule | 3 | project_tasks, schedule_baselines, task_links |
| WMS | 4 | inbound_receipts, inbound_lines, outbound_orders, outbound_lines |
| Inventory | 2 | inventory_items, locations |
| SCM | 5 | purchase_orders, purchase_order_lines, goods_receipt_notes, goods_receipt_lines, serial_numbers |
| Master Data (Products) | 2 | products, suppliers |
| TMS | 2 | waybills, vehicles |
| System | 6 | audit_logs, system_settings, project_folders, project_documents, document_notifications |
| Approvals | 4 | approval_configs, approval_config_steps, approval_requests, approval_steps |
| Master Data (Reference) | 6 | provinces, communes, cargo_types, delivery_providers, delivery_types, transport_routes, transport_statuses |
| **TONG** | **~69** | |
