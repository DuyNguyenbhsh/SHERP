import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'

import type { OrgType } from '../types'

export interface CreateOrgPayload {
  organization_code: string
  organization_name: string
  description?: string
  parent_id?: string
  org_type?: OrgType
}

export interface UpdateOrgPayload {
  organization_code?: string
  organization_name?: string
  description?: string
  parent_id?: string | null
  org_type?: OrgType
}

async function createOrg(payload: CreateOrgPayload): Promise<void> {
  await api.post('/organizations', payload)
}

async function updateOrg({ id, ...payload }: UpdateOrgPayload & { id: string }): Promise<void> {
  await api.patch(`/organizations/${id}`, payload)
}

async function deleteOrg(id: string): Promise<void> {
  await api.delete(`/organizations/${id}`)
}

export function useCreateOrganization() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createOrg,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['organizations'] }),
  })
}

export function useUpdateOrganization() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateOrg,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['organizations'] }),
  })
}

export function useDeleteOrganization() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteOrg,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['organizations'] }),
  })
}
