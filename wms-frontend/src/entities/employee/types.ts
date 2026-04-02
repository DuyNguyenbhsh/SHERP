export interface Employee {
  id: string
  employee_code: string
  full_name: string
  email: string | null
  phone: string | null
  job_title?: string | null
  status: string
  department: {
    id: string
    organization_code: string
    organization_name: string
  } | null
  created_at: string
}
