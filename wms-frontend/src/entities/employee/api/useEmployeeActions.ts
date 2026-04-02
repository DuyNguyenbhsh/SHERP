import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'

// ── DELETE (Soft Delete) ──
async function deleteEmployee(id: string): Promise<void> {
  await api.delete(`/employees/${id}`)
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
  })
}

// ── CHANGE STATUS ──
interface ChangeStatusPayload {
  id: string
  status: string
  reason?: string
}

async function changeStatus(payload: ChangeStatusPayload): Promise<void> {
  await api.patch(`/employees/${payload.id}/status`, {
    status: payload.status,
    reason: payload.reason,
  })
}

export function useChangeStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: changeStatus,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
  })
}

// ── UPDATE ──
interface UpdateEmployeePayload {
  id: string
  data: Record<string, unknown>
}

async function updateEmployee(payload: UpdateEmployeePayload): Promise<void> {
  await api.patch(`/employees/${payload.id}`, payload.data)
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateEmployee,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
  })
}
