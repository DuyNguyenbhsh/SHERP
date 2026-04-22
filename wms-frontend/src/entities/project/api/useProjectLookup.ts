import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { LookupProjectItem, LookupProjectsQuery, LookupProjectsResponse } from '../types'

interface ApiEnvelope<T> {
  status: boolean | string
  message: string
  data: T
}

/**
 * Backend whitelist mặc định cho active projects (SA_DESIGN §3.1.4).
 * Phải khớp với PROJECT_ACTIVE_STATUSES bên backend
 * (wms-backend/src/projects/enums/project.enum.ts).
 */
const PROJECT_ACTIVE_STATUSES = ['WON_BID', 'ACTIVE', 'ON_HOLD', 'SETTLING', 'WARRANTY'] as const

/**
 * Search projects for LOV picker (GET /projects/lookup).
 * @param query.q - search term (max 100 chars, unaccent server-side)
 * @param query.limit - page size (1-50, default 20)
 * @param query.offset - pagination offset (default 0)
 * @param includeInactive - when true, omit status_whitelist (show all statuses)
 */
export function useProjectLookup(
  query: LookupProjectsQuery & { includeInactive?: boolean },
  options?: { enabled?: boolean },
): UseQueryResult<LookupProjectsResponse, Error> {
  const { includeInactive, ...rest } = query
  const params = new URLSearchParams()
  if (rest.q) params.set('q', rest.q)
  if (rest.limit !== undefined) params.set('limit', String(rest.limit))
  if (rest.offset !== undefined) params.set('offset', String(rest.offset))
  if (!includeInactive) {
    params.set('status_whitelist', PROJECT_ACTIVE_STATUSES.join(','))
  }
  const qs = params.toString()

  return useQuery({
    queryKey: [
      'project-lookup',
      rest.q ?? '',
      rest.limit ?? 20,
      rest.offset ?? 0,
      Boolean(includeInactive),
    ],
    queryFn: async () => {
      const { data } = await api.get<ApiEnvelope<LookupProjectsResponse>>(
        `/projects/lookup${qs ? `?${qs}` : ''}`,
      )
      return data.data
    },
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
  })
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
