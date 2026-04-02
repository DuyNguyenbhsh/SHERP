export type OrgType = 'CORPORATE_DEPT' | 'RETAIL_STORE'

export interface Organization {
  id: string
  organization_code: string
  organization_name: string
  description: string | null
  org_type: OrgType
  parent: {
    id: string
    organization_code: string
    organization_name: string
  } | null
  children: Organization[]
  employees: {
    id: string
    employee_code: string
    full_name: string
    email: string | null
    phone: string | null
    status: string
  }[]
}
