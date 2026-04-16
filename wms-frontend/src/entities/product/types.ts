export const ItemType = {
  GOODS: 'GOODS',
  SERVICE: 'SERVICE',
  ASSET: 'ASSET',
  COMBO: 'COMBO',
} as const
export type ItemType = (typeof ItemType)[keyof typeof ItemType]

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  GOODS: 'Hàng hóa',
  SERVICE: 'Dịch vụ',
  ASSET: 'Tài sản',
  COMBO: 'Bộ / Combo',
}

export const PlanningMethod = {
  MIN_MAX: 'MIN_MAX',
  REORDER_POINT: 'ROP',
  NOT_PLANNED: 'NONE',
} as const
export type PlanningMethod = (typeof PlanningMethod)[keyof typeof PlanningMethod]

export const CostingMethod = {
  MOVING_AVERAGE: 'AVERAGE',
  FIFO: 'FIFO',
  SPECIFIC: 'SPECIFIC',
} as const
export type CostingMethod = (typeof CostingMethod)[keyof typeof CostingMethod]

export interface Product {
  id: string
  sku: string
  barcode: string | null
  name: string
  alias: string | null
  brand_id: string | null
  category_id: string | null
  item_type: ItemType
  unit_of_measure: string
  is_inventory_tracking: boolean
  is_serial_tracking: boolean
  is_taxable: boolean
  warranty_months_vendor: number
  warranty_months_customer: number
  purchase_price: number
  retail_price: number
  wholesale_price: number
  planning_method: PlanningMethod
  costing_method: CostingMethod
  min_stock_level: number | null
  max_stock_level: number | null
  lead_time_days: number
  safety_stock_qty: number
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateProductPayload {
  sku: string
  name: string
  item_type?: ItemType
  unit_of_measure?: string
  purchase_price?: number
  retail_price?: number
  wholesale_price?: number
  warranty_months_vendor?: number
  warranty_months_customer?: number
  is_serial_tracking?: boolean
  notes?: string
}

export type UpdateProductPayload = Partial<CreateProductPayload> & {
  is_active?: boolean
}
