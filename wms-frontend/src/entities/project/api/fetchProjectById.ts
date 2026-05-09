import { api } from '@/shared/api/axios'
import type { LookupProjectItem } from '../types'

interface ApiEnvelope<T> {
  status: boolean | string
  message: string
  data: T
}

/**
 * One-off fetch: get a project's lookup shape by ID.
 * Used for edit-mode hydration in picker components.
 * Returns null if not found or user lacks permission (404/403 → null).
 *
 * Backend endpoint GET /projects/:id returns full Project entity with
 * `organization` relation (field: organization_name, not name) —
 * verified against wms-backend/src/projects/entities/project.entity.ts + projects.service.ts:93.
 */
export async function fetchProjectById(id: string): Promise<LookupProjectItem | null> {
  try {
    const { data } = await api.get<
      ApiEnvelope<{
        id: string
        project_code: string
        project_name: string
        status: LookupProjectItem['status']
        stage: LookupProjectItem['stage']
        organization_id?: string | null
        organization?: {
          id: string
          organization_code: string
          organization_name: string
        } | null
      }>
    >(`/projects/${id}`)
    const p = data.data
    return {
      id: p.id,
      project_code: p.project_code,
      project_name: p.project_name,
      status: p.status,
      stage: p.stage,
      organization_id: p.organization?.id ?? p.organization_id ?? null,
      organization_name: p.organization?.organization_name ?? null,
    }
  } catch {
    return null
  }
}
