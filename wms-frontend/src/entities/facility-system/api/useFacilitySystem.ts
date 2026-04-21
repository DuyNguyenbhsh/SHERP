import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { FacilityEquipmentItem, FacilitySystem } from '../types'

interface ApiResponse<T> {
  status?: string | boolean
  message?: string
  data: T
}

export function useFacilitySystems(): UseQueryResult<FacilitySystem[]> {
  return useQuery({
    queryKey: ['master-data', 'facility-systems'],
    queryFn: async (): Promise<FacilitySystem[]> => {
      const { data } = await api.get<ApiResponse<FacilitySystem[]>>('/master-data/facility-systems')
      return data.data
    },
    staleTime: 5 * 60 * 1000, // master-data hiếm thay đổi
  })
}

export function useFacilityEquipmentItems(
  systemId: string | null,
): UseQueryResult<FacilityEquipmentItem[]> {
  return useQuery({
    queryKey: ['master-data', 'facility-equipment-items', systemId],
    queryFn: async (): Promise<FacilityEquipmentItem[]> => {
      const params = systemId ? { system_id: systemId } : {}
      const { data } = await api.get<ApiResponse<FacilityEquipmentItem[]>>(
        '/master-data/facility-equipment-items',
        { params },
      )
      return data.data
    },
    enabled: Boolean(systemId),
    staleTime: 5 * 60 * 1000,
  })
}
