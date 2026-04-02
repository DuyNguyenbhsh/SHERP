export interface UserRole {
  id: string
  role: {
    id: string
    role_code: string
    role_name: string
  }
}

export interface User {
  id: string
  username: string
  is_active: boolean
  employee: {
    id: string
    employee_code: string
    full_name: string
    email: string | null
  } | null
  userRoles: UserRole[]
  created_at: string
}
