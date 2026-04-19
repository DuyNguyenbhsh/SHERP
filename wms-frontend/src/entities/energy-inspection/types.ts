export const MeterType = {
  ELECTRICITY: 'ELECTRICITY',
  WATER: 'WATER',
  GAS: 'GAS',
} as const
export type MeterType = (typeof MeterType)[keyof typeof MeterType]

export const METER_TYPE_LABELS: Record<MeterType, string> = {
  ELECTRICITY: 'Điện',
  WATER: 'Nước',
  GAS: 'Gas',
}

export const EnergyInspectionStatus = {
  NEW: 'NEW',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
} as const
export type EnergyInspectionStatus =
  (typeof EnergyInspectionStatus)[keyof typeof EnergyInspectionStatus]

export interface EnergyMeter {
  id: string
  code: string
  name: string
  project_id: string
  meter_type: MeterType
  unit: string
  location_text: string | null
  is_cumulative: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface EnergyReading {
  id: string
  inspection_id: string
  meter_id: string
  value: string
  previous_value: string | null
  delta: string | null
  photo_url: string | null
  notes: string | null
  recorded_by: string
  recorded_at: string
  meter?: EnergyMeter
}

export interface EnergyInspection {
  id: string
  project_id: string
  work_item_id: string | null
  assignee_id: string
  inspection_date: string
  due_date: string | null
  status: EnergyInspectionStatus
  notes: string | null
  required_meter_ids: string[]
  completed_at: string | null
  readings: EnergyReading[]
  created_at: string
  updated_at: string
}

export interface CreateMeterPayload {
  code: string
  name: string
  project_id: string
  meter_type: MeterType
  unit: string
  location_text?: string
  is_cumulative?: boolean
}

export interface CreateInspectionPayload {
  project_id: string
  work_item_id?: string
  assignee_id: string
  inspection_date: string
  due_date?: string
  required_meter_ids: string[]
  notes?: string
}

export interface RecordReadingPayload {
  meter_id: string
  value: string
  photo_url?: string
  notes?: string
}
