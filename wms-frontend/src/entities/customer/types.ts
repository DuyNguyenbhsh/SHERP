export const CustomerType = {
  INDIVIDUAL: 'INDIVIDUAL',
  CORPORATE: 'CORPORATE',
  WHOLESALE: 'WHOLESALE',
  RETAIL: 'RETAIL',
} as const
export type CustomerType = (typeof CustomerType)[keyof typeof CustomerType]

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  INDIVIDUAL: 'Cá nhân',
  CORPORATE: 'Doanh nghiệp',
  WHOLESALE: 'Khách sỉ',
  RETAIL: 'Khách lẻ',
}

export const CustomerPaymentTerm = {
  COD: 'COD',
  NET15: 'NET15',
  NET30: 'NET30',
  EOM: 'EOM',
  PREPAY: 'PREPAY',
} as const
export type CustomerPaymentTerm = (typeof CustomerPaymentTerm)[keyof typeof CustomerPaymentTerm]

export const CUSTOMER_PAYMENT_TERM_LABELS: Record<CustomerPaymentTerm, string> = {
  COD: 'Giao ngay (COD)',
  NET15: 'Công nợ 15 ngày',
  NET30: 'Công nợ 30 ngày',
  EOM: 'Cuối tháng',
  PREPAY: 'Ứng trước',
}

export interface Customer {
  id: string
  customer_code: string
  name: string
  short_name: string | null
  tax_code: string | null
  customer_type: CustomerType
  primary_contact: string | null
  primary_phone: string | null
  primary_email: string | null
  billing_address: string | null
  shipping_address: string | null
  payment_term: CustomerPaymentTerm
  credit_limit: number
  current_debt: number
  is_active: boolean
  is_blacklisted: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CreateCustomerPayload {
  name: string
  short_name?: string
  tax_code?: string
  customer_type?: CustomerType
  primary_contact?: string
  primary_phone?: string
  primary_email?: string
  billing_address?: string
  shipping_address?: string
  payment_term?: CustomerPaymentTerm
  credit_limit?: number
  notes?: string
}

export type UpdateCustomerPayload = Partial<CreateCustomerPayload> & {
  is_active?: boolean
  is_blacklisted?: boolean
}

export interface CustomerDebt {
  customer_id: string
  customer_code: string
  credit_limit: number
  current_debt: number
  available: number
}
