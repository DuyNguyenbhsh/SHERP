import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type {
  EnergyMeter,
  EnergyInspection,
  CreateMeterPayload,
  CreateInspectionPayload,
  RecordReadingPayload,
} from '../types'

interface ApiResponse<T> {
  status?: string | boolean
  message?: string
  data: T
}

// ── Meters ────────────────────────────────────────────────
export function useEnergyMeters(filter: { projectId?: string; active?: boolean } = {}) {
  return useQuery({
    queryKey: ['energy-meters', filter],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (filter.projectId) params.projectId = filter.projectId
      if (filter.active !== undefined) params.active = String(filter.active)
      const { data } = await api.get<ApiResponse<EnergyMeter[]>>('/energy-meters', { params })
      return data.data
    },
  })
}

export function useCreateMeter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateMeterPayload) => {
      const { data } = await api.post<ApiResponse<EnergyMeter>>('/energy-meters', payload)
      return data.data
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['energy-meters'] }),
  })
}

// ── Inspections ───────────────────────────────────────────
export function useEnergyInspection(id: string | null) {
  return useQuery({
    queryKey: ['energy-inspections', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<EnergyInspection>>(`/energy-inspections/${id!}`)
      return data.data
    },
    enabled: Boolean(id),
  })
}

export function useCreateInspection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateInspectionPayload) => {
      const { data } = await api.post<ApiResponse<EnergyInspection>>('/energy-inspections', payload)
      return data.data
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['energy-inspections'] }),
  })
}

export function useRecordReading(inspectionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: RecordReadingPayload) => {
      const { data } = await api.post<ApiResponse<unknown>>(
        `/energy-inspections/${inspectionId}/readings`,
        payload,
      )
      return data.data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['energy-inspections', inspectionId] })
      void qc.invalidateQueries({ queryKey: ['work-items'] })
    },
  })
}
