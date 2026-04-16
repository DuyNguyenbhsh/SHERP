export const OutboundType = {
  SALES_ORDER: 'SALES_ORDER',
  TRANSFER: 'TRANSFER',
  PRODUCTION: 'PRODUCTION',
  RETURN_VENDOR: 'RETURN_VENDOR',
  SAMPLE: 'SAMPLE',
} as const
export type OutboundType = (typeof OutboundType)[keyof typeof OutboundType]

export const OUTBOUND_TYPE_LABELS: Record<OutboundType, string> = {
  SALES_ORDER: 'Bán hàng',
  TRANSFER: 'Chuyển kho',
  PRODUCTION: 'Xuất sản xuất',
  RETURN_VENDOR: 'Trả NCC',
  SAMPLE: 'Hàng mẫu',
}

export const OutboundStatus = {
  PENDING: 'PENDING',
  ALLOCATED: 'ALLOCATED',
  PICKING: 'PICKING',
  PICKED: 'PICKED',
  PACKING: 'PACKING',
  PACKED: 'PACKED',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELED: 'CANCELED',
} as const
export type OutboundStatus = (typeof OutboundStatus)[keyof typeof OutboundStatus]

export const OUTBOUND_STATUS_LABELS: Record<OutboundStatus, string> = {
  PENDING: 'Chờ phân bổ',
  ALLOCATED: 'Đã phân bổ',
  PICKING: 'Đang lấy',
  PICKED: 'Đã lấy',
  PACKING: 'Đang đóng gói',
  PACKED: 'Đã đóng gói',
  SHIPPED: 'Đã xuất kho',
  DELIVERED: 'Đã giao',
  CANCELED: 'Hủy',
}

export interface OutboundLine {
  id: string
  product_id: string
  requested_qty: number
  picked_qty: number
  pick_status: string
  lot_number: string | null
  notes: string | null
}

export interface OutboundOrder {
  id: string
  order_number: string
  order_type: OutboundType
  status: OutboundStatus
  customer_name: string | null
  customer_phone: string | null
  delivery_address: string | null
  warehouse_code: string | null
  lines: OutboundLine[]
  created_at: string
  updated_at: string
}

export interface CreateOutboundLinePayload {
  product_id: string
  requested_qty: number
  lot_number?: string
  notes?: string
}

export interface CreateOutboundOrderPayload {
  order_type: OutboundType
  customer_name?: string
  customer_phone?: string
  delivery_address?: string
  warehouse_code?: string
  notes?: string
  lines: CreateOutboundLinePayload[]
}
