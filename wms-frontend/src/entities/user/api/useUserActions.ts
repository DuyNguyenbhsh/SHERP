import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'

// Toggle active status
interface ToggleStatusPayload {
  id: string
  is_active: boolean
}

async function toggleUserStatus(p: ToggleStatusPayload): Promise<void> {
  await api.patch(`/users/${p.id}`, { is_active: p.is_active })
}

export function useToggleUserStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: toggleUserStatus,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

// Delete user
async function deleteUser(id: string): Promise<void> {
  await api.delete(`/users/${id}`)
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteUser,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

// Create user (Employee-Linked)
export interface CreateUserPayload {
  employee_id: string
  username: string
  password: string
  role_id: string
}

async function createUser(p: CreateUserPayload): Promise<void> {
  await api.post('/users', p)
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] })
      void qc.invalidateQueries({ queryKey: ['employees-unlinked'] })
    },
  })
}

// Update user (password, role)
interface UpdateUserPayload {
  id: string
  data: Record<string, unknown>
}

async function updateUser(p: UpdateUserPayload): Promise<void> {
  await api.patch(`/users/${p.id}`, p.data)
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateUser,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['users'] }),
  })
}
