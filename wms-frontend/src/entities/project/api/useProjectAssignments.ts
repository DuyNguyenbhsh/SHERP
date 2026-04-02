import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { ProjectAssignment, AssignmentRole } from '../types'

interface ApiResponse {
  status: string
  message: string
  data: ProjectAssignment[]
}

async function fetchAllAssignments(): Promise<ProjectAssignment[]> {
  const { data } = await api.get<ApiResponse>('/projects/assignments/all')
  return data.data
}

export function useProjectAssignments() {
  return useQuery({ queryKey: ['project-assignments'], queryFn: fetchAllAssignments })
}

export interface CreateAssignmentPayload {
  project_id: string
  employee_id: string
  role?: AssignmentRole
}

async function createAssignment({
  project_id,
  ...payload
}: CreateAssignmentPayload): Promise<void> {
  await api.post(`/projects/${project_id}/assignments`, payload)
}

async function deleteAssignment(assignmentId: string): Promise<void> {
  await api.delete(`/projects/assignments/${assignmentId}`)
}

export function useCreateAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createAssignment,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['project-assignments'] }),
  })
}

export function useDeleteAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteAssignment,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['project-assignments'] }),
  })
}
