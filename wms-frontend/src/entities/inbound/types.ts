export const InboundType = {
  PO_RECEIPT: 'PO_RECEIPT',
  RETURN: 'RETURN',
  TRANSFER: 'TRANSFER',
  ADJUSTMENT: 'ADJUSTMENT',
} as const
export type InboundType = (typeof InboundType)[keyof typeof InboundType]

export const INBOUND_TYPE_LABELS: Record<InboundType, string> = {
  PO_RECEIPT: 'Nhập từ PO',
  RETURN: 'Hàng trả',
  TRANSFER: 'Chuyển kho',
  ADJUSTMENT: 'Điều chỉnh',
}

export const InboundStatus = {
  PENDING: 'PENDING',
  INSPECTING: 'INSPECTING',
  PUTAWAY: 'PUTAWAY',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
} as const
export type InboundStatus = (typeof InboundStatus)[keyof typeof InboundStatus]

export const INBOUND_STATUS_LABELS: Record<InboundStatus, string> = {
  PENDING: 'Chờ nhận hàng',
  INSPECTING: 'Đang kiểm tra',
  PUTAWAY: 'Đang lên kệ',
  COMPLETED: 'Hoàn tất',
  REJECTED: 'Từ chối',
}

export interface InboundLine {
  id: string
  product_id: string
  expected_qty: number
  received_qty: number
  accepted_qty: number
  rejected_qty: number
  qc_status: 'PENDING' | 'PASSED' | 'FAILED' | 'PARTIAL'
  putaway_location: string | null
  lot_number: string | null
  notes: string | null
}

export interface InboundReceipt {
  id: string
  receipt_number: string
  receipt_type: InboundType
  status: InboundStatus
  po_id: string | null
  grn_id: string | null
  warehouse_code: string | null
  dock_number: string | null
  received_by: string | null
  notes: string | null
  lines: InboundLine[]
  created_at: string
  updated_at: string
}

export interface CreateInboundLinePayload {
  product_id: string
  expected_qty: number
  received_qty?: number
  lot_number?: string
  notes?: string
}

export interface CreateInboundReceiptPayload {
  receipt_type: InboundType
  po_id?: string
  grn_id?: string
  warehouse_code?: string
  dock_number?: string
  received_by?: string
  notes?: string
  lines: CreateInboundLinePayload[]
}
