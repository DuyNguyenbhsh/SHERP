import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { ProjectStage, ProjectStatus } from '../types'

export interface CreateProjectPayload {
  project_code: string
  project_name: string
  description?: string
  organization_id?: string
  stage?: ProjectStage
  status?: ProjectStatus
  location?: string
  gfa_m2?: number
  investor_id?: string
  manager_id?: string
  department_id?: string
  budget?: number
}

export interface UpdateProjectPayload {
  project_code?: string
  project_name?: string
  description?: string
  organization_id?: string
  stage?: ProjectStage
  status?: ProjectStatus
  location?: string
  gfa_m2?: number
  investor_id?: string
  manager_id?: string
  department_id?: string
  budget?: number
  change_reason?: string
}

async function createProject(payload: CreateProjectPayload): Promise<void> {
  await api.post('/projects', payload)
}

async function updateProject({
  id,
  ...payload
}: UpdateProjectPayload & { id: string }): Promise<void> {
  await api.patch(`/projects/${id}`, payload)
}

async function deleteProject(id: string): Promise<void> {
  await api.delete(`/projects/${id}`)
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createProject,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateProject,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteProject,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

// ── CHECK CODE ──

interface CheckCodeResponse {
  status: string
  data: { exists: boolean }
}

export async function checkProjectCode(code: string): Promise<boolean> {
  const { data } = await api.get<CheckCodeResponse>(
    `/projects/check-code/${encodeURIComponent(code)}`,
  )
  return data.data.exists
}
