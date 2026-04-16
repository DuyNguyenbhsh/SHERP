import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { Vehicle, CreateVehiclePayload, UpdateVehiclePayload } from '../types'

interface ApiResponse<T> {
  status: string | boolean
  message: string
  data: T
}

async function fetchVehicles(): Promise<Vehicle[]> {
  const { data } = await api.get<ApiResponse<Vehicle[]>>('/vehicles')
  return data.data
}

export function useVehicles() {
  return useQuery({ queryKey: ['vehicles'], queryFn: fetchVehicles })
}

async function createVehicle(payload: CreateVehiclePayload): Promise<Vehicle> {
  const { data } = await api.post<ApiResponse<Vehicle>>('/vehicles', payload)
  return data.data
}

export function useCreateVehicle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createVehicle,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['vehicles'] }),
  })
}

async function updateVehicle(args: { id: string; data: UpdateVehiclePayload }): Promise<Vehicle> {
  const { data } = await api.patch<ApiResponse<Vehicle>>(`/vehicles/${args.id}`, args.data)
  return data.data
}

export function useUpdateVehicle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateVehicle,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['vehicles'] }),
  })
}

async function deleteVehicle(id: string): Promise<void> {
  await api.delete(`/vehicles/${id}`)
}

export function useDeleteVehicle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteVehicle,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['vehicles'] }),
  })
}
