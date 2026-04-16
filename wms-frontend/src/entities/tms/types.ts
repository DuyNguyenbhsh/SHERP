export const WaybillStatus = {
  DRAFT: 'DRAFT',
  READY_TO_PICK: 'READY_TO_PICK',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  CANCELED: 'CANCELED',
} as const
export type WaybillStatus = (typeof WaybillStatus)[keyof typeof WaybillStatus]

export const WAYBILL_STATUS_LABELS: Record<WaybillStatus, string> = {
  DRAFT: 'Nháp',
  READY_TO_PICK: 'Chờ lấy hàng',
  IN_TRANSIT: 'Đang vận chuyển',
  DELIVERED: 'Đã giao',
  CANCELED: 'Hủy',
}

export const CodStatus = {
  PENDING: 'PENDING',
  COLLECTED: 'COLLECTED',
} as const
export type CodStatus = (typeof CodStatus)[keyof typeof CodStatus]

export interface Waybill {
  id: string
  waybill_code: string
  status: WaybillStatus
  vehicle_id: string | null
  vehicle?: { code: string; driverName: string } | null
  cod_amount: number
  cod_status: CodStatus
  weight: number | null
  shipping_fee: number | null
  driver_name: string | null
  notes: string | null
  outbound_orders?: { id: string; order_number: string }[]
  created_at: string
  updated_at: string
}

export interface CreateWaybillPayload {
  vehicle_id?: string
  driver_name?: string
  outbound_order_ids: string[]
  cod_amount?: number
  weight?: number
  shipping_fee?: number
  notes?: string
}
