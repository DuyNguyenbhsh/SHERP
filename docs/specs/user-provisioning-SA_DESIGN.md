# SA_DESIGN: User Provisioning (Employee-Linked)

## API Endpoints

### 1. GET /api/employees/unlinked
Returns employees who do NOT have a login account yet.

```sql
SELECT e.* FROM employees e
LEFT JOIN users u ON u.employee_id = e.id
WHERE u.id IS NULL AND e.deleted_at IS NULL AND e.status = 'WORKING'
ORDER BY e.full_name ASC
```

**Response:** `{ status, message, data: Employee[] }`

### 2. POST /api/users
Creates user account linked to existing employee.

**Request Body (CreateUserDto):**
```typescript
{
  employee_id: string   // UUID, required — FK to employees
  username: string      // required, unique, max 100
  password: string      // required, min 6 chars
  role_id: string       // UUID, required — FK to roles
}
```

**Transaction Flow:**
```
BEGIN TRANSACTION
  1. Validate username uniqueness
  2. Validate employee exists & status=WORKING
  3. Validate employee not already linked to a user
  4. Validate role exists & is_active
  5. Hash password (bcrypt, salt=10)
  6. INSERT into users (username, password_hash, employee_id)
  7. INSERT into user_roles (user_id, role_id, organization_id)
  8. console.log terminal message
COMMIT
```

**Error Cases:**
- 400: Username already exists
- 400: Employee not found or not WORKING
- 400: Employee already has an account
- 400: Role not found or inactive

## ERD (Unchanged)
```
Employee (1) <──── (0..1) User (1) ────> (N) UserRole (N) <──── (1) Role
                                                  |
                                           Organization (optional)
```

## Folder Structure
```
src/users/
  ├── dto/create-user.dto.ts     # Validated DTO
  ├── users.controller.ts        # POST /users, GET /users
  ├── users.service.ts           # create(), findAll(), update(), remove()
  └── users.module.ts
src/employees/
  └── employees.controller.ts    # + GET /employees/unlinked
  └── employees.service.ts       # + findUnlinked()
```
