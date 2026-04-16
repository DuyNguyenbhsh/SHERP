export const SupplierType = {
  DISTRIBUTOR: 'DISTRIBUTOR',
  MANUFACTURER: 'MANUFACTURER',
  SERVICE: 'SERVICE',
  INTERNAL: 'INTERNAL',
} as const
export type SupplierType = (typeof SupplierType)[keyof typeof SupplierType]

export const SUPPLIER_TYPE_LABELS: Record<SupplierType, string> = {
  DISTRIBUTOR: 'Nhà phân phối',
  MANUFACTURER: 'Hãng sản xuất',
  SERVICE: 'Dịch vụ',
  INTERNAL: 'Nội bộ',
}

export const PaymentTerm = {
  COD: 'COD',
  NET15: 'NET15',
  NET30: 'NET30',
  EOM: 'EOM',
  PREPAYMENT: 'PREPAY',
} as const
export type PaymentTerm = (typeof PaymentTerm)[keyof typeof PaymentTerm]

export const PAYMENT_TERM_LABELS: Record<PaymentTerm, string> = {
  COD: 'Giao ngay (COD)',
  NET15: 'Công nợ 15 ngày',
  NET30: 'Công nợ 30 ngày',
  EOM: 'Cuối tháng',
  PREPAY: 'Ứng trước',
}

export interface Supplier {
  id: string
  supplier_code: string
  name: string
  short_name: string | null
  tax_code: string | null
  supplier_type: SupplierType
  contact_person: string | null
  primary_phone: string | null
  primary_email: string | null
  billing_address: string | null
  shipping_address: string | null
  payment_term: PaymentTerm
  debt_limit: number
  notes: string | null
  is_active: boolean
  is_blacklisted: boolean
  created_at: string
  updated_at: string
}

export interface CreateSupplierPayload {
  supplier_code: string
  name: string
  short_name?: string
  tax_code?: string
  supplier_type?: SupplierType
  contact_person?: string
  primary_phone?: string
  primary_email?: string
  billing_address?: string
  payment_term?: PaymentTerm
  debt_limit?: number
  notes?: string
}

export type UpdateSupplierPayload = Partial<CreateSupplierPayload> & {
  is_active?: boolean
  is_blacklisted?: boolean
}
