/**
 * Domain types cho BOQ (Bill of Quantities).
 * Pure TypeScript — không phụ thuộc framework.
 */

export interface BoqThresholdInput {
  quantity: number;
  issued_qty: number;
}

export interface BoqThresholdResult {
  exceeded: boolean;
  remaining: number;
  usage_percent: number;
}

export interface SettlementLineInput {
  product_id: string;
  product_name: string;
  unit: string;
  qty_on_site: number;
  unit_price?: number;
  notes?: string;
}

export interface SettlementLineCalc {
  product_id: string;
  product_name: string;
  unit: string;
  qty_issued: number;
  qty_returned: number;
  qty_on_site: number;
  qty_variance: number;
  unit_price: number;
  value_variance: number;
  notes?: string;
}

export interface SettlementTotals {
  total_material_in: number;
  total_material_out: number;
  on_site_stock_value: number;
  variance: number;
  variance_percent: number;
}
