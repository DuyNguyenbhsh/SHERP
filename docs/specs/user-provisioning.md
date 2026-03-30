# BA_SPEC: User Provisioning (Employee-Linked)

## US-UP-01: Create User Account from Existing Employee

**As** an Admin with `MANAGE_USER` privilege,
**I want** to create a login account for an existing employee,
**So that** they can access the ERP system with appropriate permissions.

### Business Rules

| # | Rule | Type |
|---|------|------|
| BR-01 | Each User MUST link to exactly 1 Employee (employee_id required) | Hard |
| BR-02 | Each Employee can have at most 1 User account (1:1) | Hard |
| BR-03 | Username must be unique across the system | Hard |
| BR-04 | At least 1 Role must be assigned at creation | Hard |
| BR-05 | Password minimum 6 characters, hashed with bcrypt | Hard |
| BR-06 | Employee's Department/Site is inherited (not manually entered) | Soft |
| BR-07 | Only employees with status=WORKING can be provisioned | Soft |

### Modal Form Fields

| Field | Source | Required | Validation |
|-------|--------|----------|------------|
| Employee | Dropdown: GET /employees/unlinked | Yes | Must be valid, unlinked employee |
| Username | Manual input | Yes | Unique, max 100 chars |
| Password | Manual input | Yes | Min 6 chars |
| Role | Dropdown: GET /roles | Yes | Must select at least 1 active role |

### Post-Condition
- Terminal log: `"Da tao tai khoan cho nhan vien [Ten] voi vai tro [Role]"`
- Employee info (name, email, department) auto-displayed after selection

### Affected Tables
- `users` (INSERT)
- `user_roles` (INSERT)
- `employees` (READ only — no modification)
