import type { CustomerPaymentTerm } from '@/entities/customer'

export const QuoteStatus = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
} as const
export type QuoteStatus = (typeof QuoteStatus)[keyof typeof QuoteStatus]

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: 'Nháp',
  SENT: 'Đã gửi',
  ACCEPTED: 'Khách đồng ý',
  REJECTED: 'Khách từ chối',
  EXPIRED: 'Hết hạn',
}

export const SalesOrderStatus = {
  CONFIRMED: 'CONFIRMED',
  FULFILLING: 'FULFILLING',
  DELIVERED: 'DELIVERED',
  CANCELED: 'CANCELED',
} as const
export type SalesOrderStatus = (typeof SalesOrderStatus)[keyof typeof SalesOrderStatus]

export const SALES_ORDER_STATUS_LABELS: Record<SalesOrderStatus, string> = {
  CONFIRMED: 'Đã xác nhận',
  FULFILLING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELED: 'Đã hủy',
}

export interface QuoteLine {
  id?: string
  product_id: string
  qty: number
  unit_price: number
  discount_percent: number
  tax_percent: number
  line_subtotal?: number
  line_discount?: number
  line_tax?: number
  line_total?: number
  notes?: string | null
}

export interface SalesQuote {
  id: string
  quote_number: string
  customer_id: string
  customer?: { id: string; name: string; customer_code: string }
  status: QuoteStatus
  effective_date: string
  expiry_date: string
  total_subtotal: number
  total_discount: number
  total_tax: number
  grand_total: number
  converted_to_so_id: string | null
  sales_rep_id: string | null
  notes: string | null
  lines?: QuoteLine[]
  created_at: string
  updated_at: string
}

export interface SalesOrderLine extends QuoteLine {
  qty_fulfilled?: number
}

export interface SalesOrder {
  id: string
  order_number: string
  customer_id: string
  customer?: { id: string; name: string; customer_code: string }
  quote_id: string | null
  status: SalesOrderStatus
  outbound_order_id: string | null
  order_date: string
  required_delivery_date: string | null
  ship_to_address: string | null
  payment_term: CustomerPaymentTerm
  total_subtotal: number
  total_discount: number
  total_tax: number
  grand_total: number
  is_credit_bypassed: boolean
  bypass_reason: string | null
  sales_rep_id: string | null
  notes: string | null
  lines?: SalesOrderLine[]
  outbound_order_number?: string
  created_at?: string
  updated_at: string
}

export interface CreateQuotePayload {
  customer_id: string
  effective_date: string
  expiry_date: string
  sales_rep_id?: string
  notes?: string
  lines: Omit<QuoteLine, 'id' | 'line_subtotal' | 'line_discount' | 'line_tax' | 'line_total'>[]
}

export interface CreateSalesOrderPayload {
  customer_id: string
  quote_id?: string
  required_delivery_date?: string
  ship_to_address?: string
  payment_term?: CustomerPaymentTerm
  bypass_reason?: string
  sales_rep_id?: string
  notes?: string
  lines: Omit<QuoteLine, 'id' | 'line_subtotal' | 'line_discount' | 'line_tax' | 'line_total'>[]
}

export interface SalesKpi {
  total_orders: number
  total_bookings: number
  revenue_delivered: number
  avg_order_value: number
}
