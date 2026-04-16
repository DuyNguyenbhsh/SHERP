export const PoStatus = {
  DRAFT: 'DRAFT',
  APPROVED: 'APPROVED',
  RECEIVING: 'RECEIVING',
  COMPLETED: 'COMPLETED',
  CANCELED: 'CANCELED',
} as const
export type PoStatus = (typeof PoStatus)[keyof typeof PoStatus]

export const PO_STATUS_LABELS: Record<PoStatus, string> = {
  DRAFT: 'Nháp',
  APPROVED: 'Đã duyệt',
  RECEIVING: 'Đang nhập kho',
  COMPLETED: 'Đã nhập đủ',
  CANCELED: 'Hủy',
}

export interface PurchaseOrderLine {
  id: string
  product_id: string
  order_qty: number
  received_qty: number
  unit_price: number
}

export interface PurchaseOrder {
  id: string
  po_number: string
  vendor_id: string | null
  status: PoStatus
  total_amount: number
  project_id: string | null
  category_id: string | null
  lines: PurchaseOrderLine[]
  created_at: string
  updated_at: string
}

export interface CreatePoLinePayload {
  product_id: string
  order_qty: number
  unit_price: number
}

export interface CreatePoPayload {
  vendor_id: string
  project_id?: string
  category_id?: string
  lines: CreatePoLinePayload[]
}

export interface ReceiveGoodsLinePayload {
  po_line_id: string
  received_qty: number
  serial_numbers: string[]
}

export interface ReceiveGoodsPayload {
  po_id: string
  received_by: string
  lines: ReceiveGoodsLinePayload[]
}
