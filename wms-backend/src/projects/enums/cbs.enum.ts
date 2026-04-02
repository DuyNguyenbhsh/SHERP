/**
 * Cost Breakdown Structure (CBS) — Phân loại chi phí dự án
 * Theo chuẩn quản lý chi phí xây dựng/BĐS.
 */
export enum CbsCategory {
  LAND = 'LAND', // Chi phí đất đai
  DESIGN = 'DESIGN', // Chi phí thiết kế
  PERMIT_FEE = 'PERMIT_FEE', // Phí cấp phép
  CONSTRUCTION = 'CONSTRUCTION', // Chi phí xây dựng
  SUPERVISION = 'SUPERVISION', // Chi phí giám sát
  EQUIPMENT = 'EQUIPMENT', // Thiết bị, máy móc
  INFRASTRUCTURE = 'INFRASTRUCTURE', // Hạ tầng kỹ thuật
  MANAGEMENT = 'MANAGEMENT', // Chi phí quản lý dự án
  CONTINGENCY = 'CONTINGENCY', // Dự phòng
  OTHER = 'OTHER', // Chi phí khác
}

export const CBS_LABELS: Record<CbsCategory, string> = {
  [CbsCategory.LAND]: 'Chi phí đất đai',
  [CbsCategory.DESIGN]: 'Chi phí thiết kế',
  [CbsCategory.PERMIT_FEE]: 'Phí cấp phép',
  [CbsCategory.CONSTRUCTION]: 'Chi phí xây dựng',
  [CbsCategory.SUPERVISION]: 'Chi phí giám sát',
  [CbsCategory.EQUIPMENT]: 'Thiết bị & Máy móc',
  [CbsCategory.INFRASTRUCTURE]: 'Hạ tầng kỹ thuật',
  [CbsCategory.MANAGEMENT]: 'Quản lý dự án',
  [CbsCategory.CONTINGENCY]: 'Dự phòng',
  [CbsCategory.OTHER]: 'Chi phí khác',
};
