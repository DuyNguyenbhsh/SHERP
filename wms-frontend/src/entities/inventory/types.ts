export const StockStatus = {
  AVAILABLE: 'AVAILABLE',
  RESERVED: 'RESERVED',
  IN_TRANSIT: 'IN_TRANSIT',
  QUARANTINE: 'QUARANTINE',
  DAMAGED: 'DAMAGED',
} as const
export type StockStatus = (typeof StockStatus)[keyof typeof StockStatus]

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  AVAILABLE: 'Sẵn sàng',
  RESERVED: 'Đã giữ đơn',
  IN_TRANSIT: 'Đang chuyển',
  QUARANTINE: 'Tạm giữ QC',
  DAMAGED: 'Hư hỏng',
}

export interface Location {
  id: string
  code: string
  name: string
  warehouse_code: string | null
  location_type: string
  status: string
  current_qty: number
  capacity: number | null
}

export interface InventoryItem {
  id: string
  product_id: string
  location_id: string | null
  location?: Location | null
  qty_on_hand: number
  qty_reserved: number
  status: StockStatus
  lot_number: string | null
  serial_number: string | null
  warehouse_code: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface InventorySummary {
  product_id: string
  total_on_hand: number
  total_reserved: number
  total_available: number
}

export interface AdjustInventoryPayload {
  product_id: string
  location_id: string
  adjustment_qty: number
  reason: string
  lot_number?: string
  serial_number?: string
}

export interface TransferInventoryPayload {
  product_id: string
  from_location_id: string
  to_location_id: string
  qty: number
  lot_number?: string
  notes?: string
}
