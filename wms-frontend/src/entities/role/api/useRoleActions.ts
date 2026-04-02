import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'

// Create role
interface CreateRolePayload {
  role_code: string
  role_name: string
  description?: string
}

async function createRole(p: CreateRolePayload): Promise<void> {
  await api.post('/roles', p)
}

export function useCreateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createRole,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['roles'] }),
  })
}

// Update role
interface UpdateRolePayload {
  id: string
  data: { role_name?: string; description?: string }
}

async function updateRole(p: UpdateRolePayload): Promise<void> {
  await api.patch(`/roles/${p.id}`, p.data)
}

export function useUpdateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateRole,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['roles'] }),
  })
}

// Toggle status
async function toggleRoleStatus(id: string): Promise<void> {
  await api.patch(`/roles/${id}/toggle-status`)
}

export function useToggleRoleStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: toggleRoleStatus,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['roles'] }),
  })
}

// Delete role
async function deleteRole(id: string): Promise<void> {
  await api.delete(`/roles/${id}`)
}

export function useDeleteRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteRole,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['roles'] }),
  })
}
