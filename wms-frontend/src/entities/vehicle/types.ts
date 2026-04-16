export interface Vehicle {
  id: string
  code: string
  licensePlate: string | null
  driverName: string
  brand: string | null
  status: string
  description: string | null
}

export interface CreateVehiclePayload {
  code: string
  licensePlate?: string
  driverName: string
  brand?: string
  status?: string
  description?: string
}

export type UpdateVehiclePayload = Partial<CreateVehiclePayload>
