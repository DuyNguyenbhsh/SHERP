export interface FacilitySystem {
  id: string
  code: string
  name_vi: string
  name_en: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface FacilityEquipmentItem {
  id: string
  system_id: string
  code: string | null
  name_vi: string
  name_en: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  system?: FacilitySystem
}
